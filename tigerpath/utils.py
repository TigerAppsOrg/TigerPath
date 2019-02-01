from base64 import b64encode
from datetime import datetime
import os
import hashlib
import requests

TIGERBOOK_BASE_URL = 'https://tigerbook.herokuapp.com/api/v1/undergraduates/'

# Get information about the student with the specified netid from Tigerbook
def get_student_info(netid):
    url = TIGERBOOK_BASE_URL + netid
    r = requests.get(url, headers=create_tigerbook_wsse_headers())
    return r.json() if r.status_code == 200 else None

# Helper function that creates Tigerbook WSSE headers for the request
# See https://github.com/alibresco/tigerbook-api to get api key
def create_tigerbook_wsse_headers():
    created = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    nonce = b64encode(os.urandom(32)).decode()
    username = os.getenv('TIGERBOOK_USERNAME')
    password = os.getenv('TIGERBOOK_API_KEY')
    hash_arg = (nonce + created + password).encode()
    generated_digest = b64encode(hashlib.sha256(hash_arg).digest()).decode()
    headers = {
        'Authorization': 'WSSE profile="UsernameToken"',
        'X-WSSE': 'UsernameToken Username="{}", PasswordDigest="{}", Nonce="{}", Created="{}"'
                  .format(username, generated_digest, b64encode(nonce.encode()).decode(), created)
    }
    return headers
