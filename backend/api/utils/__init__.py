
import qrcode
from PIL import Image
from pyzbar.pyzbar import decode
import base64
from io import BytesIO
import cv2
from qreader import QReader
import hashlib
import random
import string
import numpy as np


def generate_qr_code(data):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )

    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffered=BytesIO()
    img.save(buffered,format="PNG")
    buffered.seek(0)

    qr=base64.b64encode(buffered.getvalue()).decode("utf-8")
    decode_qr=verify_qr_code(Image.open(BytesIO(base64.b64decode(qr))))
    if decode_qr!=data:
        print("QR failed")
    return qr
qreader = QReader()

def verify_qr_code(img):

    if img.mode != 'RGB':
        img = img.convert('RGB') 
    opencv_image = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


    decoded_objects = qreader.detect_and_decode(image=opencv_image)
    if decoded_objects:
        return decoded_objects[0]
    else:
        return "QR code could not be decoded"
    

def generate_random_hash():
    random_string = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    
    hash_object = hashlib.sha256()
    
    hash_object.update(random_string.encode('utf-8'))
    
    random_hash = hash_object.hexdigest()
    
    return random_hash