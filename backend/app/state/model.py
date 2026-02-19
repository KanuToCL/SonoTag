"""Global state for the FLAM model, text embeddings, and device."""

import torch

_flam_model = None
_text_embeddings = None
_device: torch.device | None = None

# In-memory cache for prepared videos (used by youtube / media routes)
_prepared_videos: dict[str, dict] = {}


# -- FLAM model --


def get_flam_model():
    return _flam_model


def set_flam_model(model):
    global _flam_model
    _flam_model = model


# -- Text embeddings --


def get_text_embeddings():
    return _text_embeddings


def set_text_embeddings(embeddings):
    global _text_embeddings
    _text_embeddings = embeddings


# -- Device --


def get_device() -> torch.device | None:
    return _device


def set_device(device: torch.device):
    global _device
    _device = device


# -- Prepared videos cache --


def get_prepared_videos() -> dict[str, dict]:
    return _prepared_videos
