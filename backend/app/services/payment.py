import razorpay
import os
import hmac
import hashlib
from dotenv import load_dotenv

load_dotenv()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def create_order(amount: int, currency: str = "INR"):
    """
    Amount in paisa (e.g., 50000 = 500 INR)
    """
    data = {
        "amount": amount,
        "currency": currency,
        "payment_capture": 1 
    }
    order = client.order.create(data=data)
    return order

def verify_payment_signature(order_id: str, payment_id: str, signature: str):
    """
    Verify Razorpay signature
    """
    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        })
        return True
    except razorpay.errors.SignatureVerificationError:
        return False
