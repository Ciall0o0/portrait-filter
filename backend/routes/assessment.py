import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from models.image import BatchRequest
from services.assessment_service import AssessmentService

router = APIRouter()
assessment_service = AssessmentService()

active_ws: dict[str, set[WebSocket]] = {}
ws_lock = asyncio.Lock()
WS_IDLE_TIMEOUT = 600  # close stale WS after 10 min


@router.post("/batch")
async def start_batch(req: BatchRequest):
    batch_id = assessment_service.create_batch(
        req.image_paths,
        model=req.model,
        force=req.force_reassess,
    )

    async def _run():
        try:
            await assessment_service.run_batch(
                batch_id,
                progress_callback=lambda status: _broadcast(batch_id, status),
            )
        except Exception as e:
            import logging
            logging.exception(f"Batch {batch_id} failed")

    asyncio.create_task(_run())

    return {"batch_id": batch_id}


@router.get("/status/{batch_id}")
async def get_batch_status(batch_id: str):
    status = assessment_service.get_batch_status(batch_id)
    if status is None:
        return {"error": "Batch not found"}
    return status


@router.websocket("/ws/batch/{batch_id}")
async def websocket_batch(websocket: WebSocket, batch_id: str):
    await websocket.accept()

    async with ws_lock:
        if batch_id not in active_ws:
            active_ws[batch_id] = set()
        active_ws[batch_id].add(websocket)

    # Send current status on connect
    status = assessment_service.get_batch_status(batch_id)
    if status:
        try:
            await websocket.send_text(json.dumps(status))
        except Exception:
            pass

    try:
        while True:
            try:
                await asyncio.wait_for(
                    websocket.receive_text(), timeout=WS_IDLE_TIMEOUT
                )
            except asyncio.TimeoutError:
                break
    except WebSocketDisconnect:
        pass
    finally:
        async with ws_lock:
            if batch_id in active_ws:
                active_ws[batch_id].discard(websocket)
                if not active_ws[batch_id]:
                    del active_ws[batch_id]


async def _broadcast(batch_id: str, status: dict):
    async with ws_lock:
        if batch_id not in active_ws:
            return
        dead = []
        message = json.dumps(status)
        for ws in list(active_ws[batch_id]):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            active_ws[batch_id].discard(ws)
        if not active_ws.get(batch_id):
            active_ws.pop(batch_id, None)
