import cv2
import os
import sys
import argparse

def extract_last_frame(video_path, output_dir=None):
    """
    提取视频的最后一帧并保存为图片
    """
    if not os.path.exists(video_path):
        print(f"❌ 视频文件不存在: {video_path}")
        return None

    # 打开视频文件
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"❌ 无法打开视频文件: {video_path}")
        return None

    # 获取视频属性
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    print(f"🎬 视频总帧数: {total_frames}, FPS: {fps}")

    # 定位到最后一帧 (通常 total_frames - 1)
    # 有些编码下定位最后一帧可能不准，所以我们尝试读取
    cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames - 1)
    ret, frame = cap.read()

    if not ret:
        # 如果定位失败，尝试回溯几帧
        for offset in range(2, 10):
            cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, total_frames - offset))
            ret, frame = cap.read()
            if ret:
                print(f"⚠️ 无法读取绝对最后一帧，已回溯至倒数第 {offset} 帧")
                break

    if ret:
        # 确定输出路径
        video_name = os.path.splitext(os.path.basename(video_path))[0]
        if output_dir is None:
            output_dir = os.path.join(os.path.dirname(video_path), "../images/last_frames")
        
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"{video_name}_last_frame.png")
        
        # 保存图片
        cv2.imwrite(output_path, frame)
        print(f"✅ 最后一帧已保存至: {output_path}")
        cap.release()
        return output_path
    else:
        print("❌ 提取帧失败")
        cap.release()
        return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Extract the last frame of a video.')
    parser.add_argument('video_path', type=str, help='Path to the video file')
    parser.add_argument('--out', type=str, default=None, help='Output directory for the image')
    
    args = parser.parse_args()
    
    extract_last_frame(args.video_path, args.out)
