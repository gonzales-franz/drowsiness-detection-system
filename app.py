import cv2
import base64
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from drowsiness_processor.main import DrowsinessDetectionSystem

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    drowsiness_detection_system = DrowsinessDetectionSystem()

    await websocket.accept()
    logger.info("Cliente WebSocket conectado")
    try:
        while True:
            # read data
            data = await websocket.receive_text()

            try:
                # Process frame
                original_image, sketch, json_report = drowsiness_detection_system.run(data)

                # Codificar sketch
                _, buffer_sketch = cv2.imencode('.jpg', sketch)
                sketch_base64 = base64.b64encode(buffer_sketch).decode('utf-8')

                # Codificar imagen original
                _, buffer_original_image = cv2.imencode('.jpg', original_image)
                original_image_base64 = base64.b64encode(buffer_original_image).decode('utf-8')

                # send answer
                await websocket.send_json({
                    "json_report": json_report,
                    "sketch_image": sketch_base64,
                    "original_image": original_image_base64,
                })
                
            except Exception as e:
                logger.error(f"Error al procesar frame: {str(e)}", exc_info=True)
                # Enviar error al cliente pero mantener conexión
                await websocket.send_json({
                    "error": str(e),
                    "json_report": {},
                    "sketch_image": "",
                    "original_image": "",
                })

    except WebSocketDisconnect:
        logger.info("Cliente WebSocket desconectado")
    except Exception as e:
        logger.error(f"Error en WebSocket: {str(e)}", exc_info=True)
