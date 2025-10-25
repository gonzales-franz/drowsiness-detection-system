import cv2
import base64
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from drowsiness_processor.main import DrowsinessDetectionSystem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    drowsiness_detection_system = DrowsinessDetectionSystem()

    await websocket.accept()
    logger.info("Cliente WebSocket conectado")
    
    frame_count = 0
    try:
        while True:
            data = await websocket.receive_text()

            try:
                original_image, sketch, json_report = drowsiness_detection_system.run(data)

                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 80]
                
                _, buffer_sketch = cv2.imencode('.jpg', sketch, encode_param)
                sketch_base64 = base64.b64encode(buffer_sketch).decode('utf-8')

                _, buffer_original_image = cv2.imencode('.jpg', original_image, encode_param)
                original_image_base64 = base64.b64encode(buffer_original_image).decode('utf-8')

                await websocket.send_json({
                    "json_report": json_report,
                    "sketch_image": sketch_base64,
                    "original_image": original_image_base64,
                })
                
                frame_count += 1
                if frame_count % 30 == 0:
                    logger.info(f"Frames procesados: {frame_count}")
                    
            except Exception as e:
                logger.error(f"Error al procesar frame: {str(e)}", exc_info=True)
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