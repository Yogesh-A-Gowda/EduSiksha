from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.base import get_db
from ..services.payment import create_order, verify_payment_signature, client
from ..api.auth import get_current_user_id

router = APIRouter()

@router.post("/create-order")
def create_payment_order(amount: int = 49900, user_id: int = Depends(get_current_user_id)):
    """
    Creates a Razorpay order. Default amount is 499 INR (49900 paisa).
    """
    try:
        order = create_order(amount)
        return {"order_id": order["id"], "amount": order["amount"], "currency": order["currency"], "key_id": client.auth[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify")
def verify_payment(
    order_id: str,
    payment_id: str,
    signature: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Verifies the payment signature.
    """
    is_valid = verify_payment_signature(order_id, payment_id, signature)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    
    return {"status": "success", "message": "Payment verified"}
