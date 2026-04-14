import hashlib
from typing import BinaryIO


def hash_file(file_obj: BinaryIO) -> str:
    hasher = hashlib.sha256()
    while chunk := file_obj.read(8192):
        hasher.update(chunk)
    return hasher.hexdigest()
