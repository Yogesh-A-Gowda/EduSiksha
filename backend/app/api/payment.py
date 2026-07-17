from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..db.base import get_db
from ..db.models import Kid
from ..services.payment import create_order, verify_payment_signature, client
from ..api.auth import get_current_user_id
from ..core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.post("/create-order")
def create_payment_order(amount: int = 49900, user_id: int = Depends(get_current_user_id)):
    """Create a Razorpay order. Default amount is 499 INR (49900 paisa)."""
    try:
        order = create_order(amount)
        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": client.auth[0],
        }
    except Exception:
        logger.exception("Razorpay order creation failed")
        raise HTTPException(status_code=500, detail="Could not create payment order")


@router.post("/verify")
def verify_payment(
    order_id: str,
    payment_id: str,
    signature: str,
    kid_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    Verify Razorpay HMAC signature and activate the kid's subscription.
    Pass kid_id as a query parameter so we know which profile to activate.
    """
    if not verify_payment_signature(order_id, payment_id, signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    # Ownership check — the kid must belong to the authenticated parent
    kid = db.query(Kid).filter(Kid.id == kid_id, Kid.parent_id == user_id).first()
    if not kid:
        raise HTTPException(status_code=403, detail="Kid not found or access denied")

    kid.subscription_status = True
    kid.is_active_access = True
    kid.subscription_expiry = datetime.utcnow() + timedelta(days=365)
    db.commit()

    logger.info(f"Subscription activated for kid {kid_id} by parent {user_id}")
    return {
        "status": "success",
        "message": "Payment verified and subscription activated",
        "kid_id": kid_id,
        "expires_at": kid.subscription_expiry.isoformat(),
    }
