from flet import *
import asyncio
import websockets
import json
import cv2
import numpy as np
import threading
import base64
import logging

from gui.resources.resources_path import (ImagePaths, FontsPath)

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Drowsiness:
    def __init__(self, page):
        self.page = page

        self.running = False
        self.video_thread = None
        self.sketch_image_control = None
        self.original_image_control = None

        self.stop_button = None
        self.start_button = None
        
        self.camera_index = None

        self.images = ImagePaths()
        self.fonts = FontsPath()

    def find_working_camera(self):
        """Encuentra el índice de una cámara funcional"""
        for i in range(3):  # Probar índices 0-2
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                ret, _ = cap.read()
                cap.release()
                if ret:
                    logger.info(f"Cámara encontrada en índice: {i}")
                    return i
        logger.error("No se encontró ninguna cámara funcional")
        return None

    def main(self):

        self.original_image_control = Image(
            width=640,
            height=480,
            fit=ImageFit.COVER,
            src_base64=self.get_placeholder_image()
        )

        self.sketch_image_control = Image(
            width=640,
            height=480,
            fit=ImageFit.COVER,
            src_base64=self.get_placeholder_image()
        )

        self.start_button = ElevatedButton(
            text="Start",
            on_click=self.start_detection,
            bgcolor='#613bbb',
            color='#FFFFFF',
        )
        self.stop_button = ElevatedButton(
            text="Stop",
            on_click=self.stop_detection,
            bgcolor='#3f64c1',
            color='#FFFFFF',
        )

        left_column = Column(
            controls=[
                Container(height=30),
                self.original_image_control,
                self.start_button,
            ],
            alignment='center',
            horizontal_alignment='center',
            spacing=20,
            expand=True
        )

        right_column = Column(
            controls=[
                Container(height=30),
                self.sketch_image_control,
                self.stop_button,
            ],
            alignment='center',
            horizontal_alignment='center',
            spacing=20,
            expand=True
        )

        elements = Container(
            content=Row(
                controls=[
                    left_column,
                    right_column
                ],
                alignment='spaceEvenly',
                vertical_alignment='center',
            ),
            bgcolor="#807da6",
            padding=0,
            expand=True
        )
        return elements

    def start_detection(self, e):
        if not self.running:
            # Buscar cámara disponible
            self.camera_index = self.find_working_camera()
            
            if self.camera_index is None:
                logger.error("No se puede iniciar: no hay cámara disponible")
                # Mostrar mensaje de error en la UI
                self.show_error_message("No se detectó ninguna cámara")
                return
            
            self.running = True
            self.video_thread = threading.Thread(target=self.run_detection, daemon=True)
            self.video_thread.start()

    def stop_detection(self, e):
        self.running = False
        self.original_image_control.src_base64 = self.get_placeholder_image()
        self.sketch_image_control.src_base64 = self.get_placeholder_image()
        self.page.update()

    def run_detection(self):
        uri = "ws://localhost:8000/ws"
        cap = cv2.VideoCapture(self.camera_index)
        
        if not cap.isOpened():
            logger.error(f"No se pudo abrir la cámara en índice {self.camera_index}")
            self.show_error_message("Error al abrir la cámara")
            return
        
        try:
            asyncio.run(self.process_video(uri, cap))
        except Exception as e:
            logger.error(f"Error en detección: {str(e)}", exc_info=True)
        finally:
            cap.release()
            logger.info("Cámara liberada")

    def show_error_message(self, message):
        """Muestra un mensaje de error en la imagen"""
        error_img = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(error_img, message, (50, 240), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        self.original_image_control.src_base64 = self.cv2_to_base64(error_img)
        self.page.update()

    def get_placeholder_image(self):
        try:
            drowsiness_image = cv2.imread(self.images.image_5)
            if drowsiness_image is None:
                # Crear imagen placeholder si no se encuentra el archivo
                drowsiness_image = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(drowsiness_image, "NO SIGNAL", (200, 240), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.5, (180, 180, 180), 3)
            
            _, buffer = cv2.imencode('.jpg', drowsiness_image)
            blank_base64 = base64.b64encode(buffer).decode('utf-8')
            return blank_base64
        except Exception as e:
            logger.error(f"Error al cargar imagen placeholder: {str(e)}")
            # Retornar imagen en blanco
            blank_img = np.zeros((480, 640, 3), dtype=np.uint8)
            _, buffer = cv2.imencode('.jpg', blank_img)
            return base64.b64encode(buffer).decode('utf-8')

    def cv2_to_base64(self, image):
        _, img_buffer = cv2.imencode(".jpg", image)
        return base64.b64encode(img_buffer).decode('utf-8')

    async def process_video(self, uri, cap):
        try:
            async with websockets.connect(uri) as websocket:
                logger.info("Conectado al servidor WebSocket")
                
                frame_count = 0
                while self.running and cap.isOpened():
                    ret, frame = cap.read()
                    if not ret:
                        logger.warning("No se pudo leer frame de la cámara")
                        break

                    # Codificar frame
                    _, buffer = cv2.imencode('.jpg', frame)
                    frame_base64 = base64.b64encode(buffer).decode('utf-8')

                    # Enviar frame
                    await websocket.send(frame_base64)

                    # Recibir respuesta
                    response = await websocket.recv()
                    response_data = json.loads(response)
                    
                    # Verificar si hay error
                    if "error" in response_data:
                        logger.error(f"Error del servidor: {response_data['error']}")
                        continue

                    # Procesar imagen sketch
                    sketch_base64 = response_data.get("sketch_image")
                    if sketch_base64:
                        sketch_data = base64.b64decode(sketch_base64)
                        nparr_sketch = np.frombuffer(sketch_data, np.uint8)
                        sketch_image = cv2.imdecode(nparr_sketch, cv2.IMREAD_COLOR)
                        self.sketch_image_control.src_base64 = self.cv2_to_base64(sketch_image)

                    # Procesar imagen original
                    original_base64 = response_data.get("original_image")
                    if original_base64:
                        original_data = base64.b64decode(original_base64)
                        nparr_original = np.frombuffer(original_data, np.uint8)
                        original_image = cv2.imdecode(nparr_original, cv2.IMREAD_COLOR)
                        self.original_image_control.src_base64 = self.cv2_to_base64(original_image)

                    # Actualizar UI
                    self.page.update()
                    
                    frame_count += 1
                    if frame_count % 30 == 0:
                        logger.info(f"Frames procesados: {frame_count}")
                    
                    await asyncio.sleep(0.01)
                    
        except websockets.exceptions.ConnectionClosed:
            logger.error("Conexión WebSocket cerrada")
            self.show_error_message("Conexión perdida con servidor")
        except Exception as e:
            logger.error(f"Error en process_video: {str(e)}", exc_info=True)
            self.show_error_message(f"Error: {str(e)}")