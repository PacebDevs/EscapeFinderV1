import os

EXCLUDED_DIRS = {'node_modules', 'dist', '.git', '__pycache__'}
EXCLUDED_EXTENSIONS = {'.log', '.lock', '.png', '.jpg', '.jpeg', '.mp4', '.zip', '.exe'}
MAX_FILE_SIZE_KB = 500

output_lines = []
env_included = False

def is_text_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            f.read(1024)
        return True
    except:
        return False

def process_directory(root_dir):
    global env_included
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIRS]
        relative_dir = os.path.relpath(dirpath, root_dir)
        output_lines.append(f"\n📁 {relative_dir}/" if relative_dir != '.' else "\n📁 /")

        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            relpath = os.path.relpath(filepath, root_dir)

            if any(filename.endswith(ext) for ext in EXCLUDED_EXTENSIONS):
                continue
            if os.path.getsize(filepath) > MAX_FILE_SIZE_KB * 1024:
                continue
            if not is_text_file(filepath):
                continue

            output_lines.append(f"  └── {filename}")
            if filename == '.env':
                env_included = True

            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                output_lines.append(f"\n--- 📄 {relpath} ---\n{content}\n")
            except Exception as e:
                output_lines.append(f"\n--- 📄 {relpath} ---\n[Error leyendo archivo: {e}]\n")

process_directory(".")

if env_included:
    output_lines.insert(0, "⚠️ AVISO: Este volcado incluye archivos `.env`.\n"
                           "No lo compartas públicamente si contiene datos sensibles.\n"
                           "============================================================\n")

with open("proyecto_dump.txt", 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))