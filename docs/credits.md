# SonoTag Credits & Acknowledgments

## About SonoTag

**SonoTag** is a real-time audio classification and visualization tool that leverages state-of-the-art language-audio models to detect and analyze sounds in audio streams.

---

## OpenFLAM - Core Audio Model

SonoTag is powered by **OpenFLAM (Frame-wise Language-Audio Modeling)**, developed by Adobe Research.

### What is FLAM?

FLAM is a cutting-edge language-audio model that supports:
- **Zero-shot sound event detection** - Detect any sound using natural language descriptions
- **Frame-wise localization** - Temporal detection of when sounds occur
- **Large-scale audio retrieval** - Search audio using free-form text queries

### Citation

If you use SonoTag or OpenFLAM in your research or projects, please cite the original work:

```bibtex
@inproceedings{flam2025,
    title={{FLAM}: Frame-Wise Language-Audio Modeling},
    author={Yusong Wu and Christos Tsirigotis and Ke Chen and Cheng-Zhi Anna Huang and Aaron Courville and Oriol Nieto and Prem Seetharaman and Justin Salamon},
    booktitle={Forty-second International Conference on Machine Learning (ICML)},
    year={2025},
    url={https://openreview.net/forum?id=7fQohcFrxG}
}
```

### OpenFLAM Resources

| Resource | Link |
|----------|------|
| **Paper** | [arXiv:2505.05335](https://arxiv.org/abs/2505.05335) |
| **Website** | [flam-model.github.io](https://flam-model.github.io/) |
| **GitHub** | [adobe-research/openflam](https://github.com/adobe-research/openflam) |
| **PyPI** | [openflam](https://pypi.org/project/openflam) |
| **Model Weights** | [HuggingFace](https://huggingface.co/kechenadobe/OpenFLAM) |

### License Notice

⚠️ **Important**: OpenFLAM is released under the [Adobe Research License](https://github.com/adobe-research/openflam/blob/main/LICENSE), which is **non-commercial only**.

Both the **code** and **model weights** are restricted to:
- Academic research
- Personal/educational use
- Non-commercial applications

**Commercial use requires separate licensing from Adobe.**

---

## Authors & Contributors

### OpenFLAM Team (Adobe Research)
- Yusong Wu
- Christos Tsirigotis
- Ke Chen
- Cheng-Zhi Anna Huang
- Aaron Courville
- Oriol Nieto
- Prem Seetharaman
- Justin Salamon

---

## Additional Technologies

SonoTag also uses the following open-source technologies:

| Technology | Purpose | License |
|------------|---------|---------|
| **FastAPI** | Backend API framework | MIT |
| **React** | Frontend UI framework | MIT |
| **Vite** | Frontend build tool | MIT |
| **PyTorch** | Deep learning framework | BSD-3 |
| **yt-dlp** | Video/audio downloading | Unlicense |
| **FFmpeg** | Audio processing | LGPL/GPL |
| **librosa** | Audio analysis | ISC |
| **Web Audio API** | Browser audio capture | W3C |

---

## Acknowledgments

We thank the Adobe Research team for making OpenFLAM publicly available for research and non-commercial use. FLAM represents a significant advancement in language-audio modeling and enables applications like SonoTag to provide zero-shot audio classification without training custom models.

---

## Contact

For questions about SonoTag, please open an issue on GitHub.

For questions about OpenFLAM licensing, please contact Adobe Research directly.
