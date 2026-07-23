import os
import sys
import zipfile
import urllib.request
import ssl
from ftplib import FTP, error_perm

HOST = "35.159.104.36"
USER = "mudutechfestcom"
PASS = "DTdREjPee6c25Fpe"
REMOTE_ROOT = "anket"
LOCAL_STANDALONE = ".next/standalone"
ZIP_NAME = "deploy.zip"
PHP_UNZIPPER = "unzip.php"

def create_zip(source_dir, output_filename):
    print(f"Creating zip archive of {source_dir}...")
    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                if file in [".DS_Store", "charts.db", ".env"]:
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)
    print(f"Zip archive created: {output_filename} ({os.path.getsize(output_filename) / 1024 / 1024:.2f} MB)")

def create_php_unzipper(output_filename):
    print(f"Creating temporary PHP unzipper: {output_filename}...")
    php_content = """<?php
$zipFile = 'deploy.zip';
if (file_exists($zipFile)) {
    $zip = new ZipArchive;
    if ($zip->open($zipFile) === TRUE) {
        $zip->extractTo(__DIR__);
        $zip->close();
        unlink($zipFile);
        echo "SUCCESS: Extracted successfully.";
    } else {
        echo "ERROR: Failed to open zip file.";
    }
} else {
    echo "ERROR: Zip file not found.";
}
unlink(__FILE__); // delete this unzipper script itself
?>
"""
    with open(output_filename, "w") as f:
        f.write(php_content)

def connect_ftp():
    print(f"Connecting to FTP server {HOST}...")
    ftp = FTP(HOST)
    ftp.login(USER, PASS)
    ftp.set_pasv(False)  # Active mode
    print("Logged in successfully (Active Mode).")
    return ftp

def make_remote_dir(ftp, dir_path):
    try:
        ftp.mkd(dir_path)
        print(f"Created remote directory: {dir_path}")
    except error_perm as e:
        if not str(e).startswith("550"):
            raise e

def main():
    if not os.path.exists(LOCAL_STANDALONE):
        print(f"Error: {LOCAL_STANDALONE} directory not found. Run npm run build first.")
        sys.exit(1)
        
    create_zip(LOCAL_STANDALONE, ZIP_NAME)
    create_php_unzipper(PHP_UNZIPPER)
    
    ftp = connect_ftp()
    try:
        make_remote_dir(ftp, REMOTE_ROOT)
        
        # Upload deploy.zip
        print(f"Uploading {ZIP_NAME} -> /{REMOTE_ROOT}/{ZIP_NAME}...")
        with open(ZIP_NAME, "rb") as f:
            ftp.storbinary(f"STOR {REMOTE_ROOT}/{ZIP_NAME}", f)
            
        # Upload unzip.php
        print(f"Uploading {PHP_UNZIPPER} -> /{REMOTE_ROOT}/{PHP_UNZIPPER}...")
        with open(PHP_UNZIPPER, "rb") as f:
            ftp.storbinary(f"STOR {REMOTE_ROOT}/{PHP_UNZIPPER}", f)
            
    finally:
        ftp.quit()
        
    # Clean up local temp files
    if os.path.exists(ZIP_NAME):
        os.remove(ZIP_NAME)
    if os.path.exists(PHP_UNZIPPER):
        os.remove(PHP_UNZIPPER)
        
    # Trigger unzip via HTTP request
    trigger_url = f"https://mudutechfest.com/{REMOTE_ROOT}/{PHP_UNZIPPER}"
    print(f"Triggering remote extraction via: {trigger_url}...")
    
    try:
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(trigger_url, context=ctx, timeout=60) as response:
            html = response.read().decode('utf-8')
            print(f"Server response:\n{html}")
            if "SUCCESS" in html:
                print("✨ Deployment successfully completed!")
            else:
                print("⚠️ Server returned an error during extraction.")
    except Exception as e:
        print(f"Error triggering extraction: {e}")
        print("Please try manually visiting the URL in your browser if the server timed out but files uploaded.")

if __name__ == "__main__":
    main()
