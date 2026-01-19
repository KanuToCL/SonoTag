import argparse

import librosa
import torch

import openflam


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a quick OpenFLAM similarity probe on a local audio file."
    )
    parser.add_argument("--audio", required=True, help="Path to a WAV file.")
    parser.add_argument(
        "--prompts",
        default="speech,applause,car horn,engine,keyboard typing",
        help="Comma-separated prompt list.",
    )
    parser.add_argument("--model", default="v1-base", help="OpenFLAM model name.")
    parser.add_argument(
        "--cache-dir",
        default="openflam_ckpt",
        help="Directory for downloaded checkpoints.",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=10.0,
        help="Seconds of audio to analyze.",
    )
    parser.add_argument(
        "--sample-rate",
        type=int,
        default=48000,
        help="Target sample rate (FLAM expects 48k).",
    )
    parser.add_argument(
        "--device",
        default="auto",
        choices=["auto", "cpu", "cuda"],
        help="Device to run inference on.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    prompts = [prompt.strip() for prompt in args.prompts.split(",") if prompt.strip()]
    if not prompts:
        raise SystemExit("No prompts provided.")

    if args.device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    else:
        device = args.device

    print(f"Using device: {device}")
    flam = openflam.OpenFLAM(
        model_name=args.model,
        default_ckpt_path=args.cache_dir,
    ).to(device)

    audio, _ = librosa.load(args.audio, sr=args.sample_rate)
    max_samples = int(args.sample_rate * args.duration)
    audio = audio[:max_samples]
    audio_tensor = torch.tensor(audio).unsqueeze(0).to(device)

    with torch.no_grad():
        audio_feature = flam.get_global_audio_features(audio_tensor)
        text_feature = flam.get_text_features(prompts)
        similarities = (text_feature @ audio_feature.T).squeeze(1)

    ranked = sorted(zip(prompts, similarities.tolist()), key=lambda item: item[1], reverse=True)
    print("Similarity scores:")
    for label, score in ranked:
        print(f"- {label}: {score:.4f}")


if __name__ == "__main__":
    main()
