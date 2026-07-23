import os
import sys
import subprocess
import threading
import time
import signal
import webbrowser
import tkinter as tk
from tkinter import scrolledtext
from tkinter import messagebox

# Colors matching the Claude Theme
BG_CANVAS = "#f8f8f6"       # Bone Parchment
BG_CARD = "#ffffff"         # Paper White
COLOR_INK = "#121212"       # Carbon Ink
COLOR_CLAY = "#d97757"      # Clay Orange Vibe
COLOR_PEBBLE = "#efeeeb"    # Soft grey/stone border
COLOR_ASHEN = "#8a8a85"     # Ashen/grey text
COLOR_GREEN = "#1f7a42"     # Metric green for active status

class ControlPanelApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Akademik Anket Sistemi")
        self.root.geometry("750x600")
        self.root.configure(bg=BG_CANVAS)
        self.root.resizable(True, True)

        self.server_process = None
        self.output_thread = None
        self.is_running = False

        self.setup_ui()
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def setup_ui(self):
        # Fonts
        font_family_serif = "Georgia"
        font_family_sans = "Helvetica"

        # Main container with padding
        main_frame = tk.Frame(self.root, bg=BG_CANVAS, padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Header Frame
        header_frame = tk.Frame(main_frame, bg=BG_CANVAS)
        header_frame.pack(fill=tk.X, pady=(0, 15))

        title_label = tk.Label(
            header_frame, 
            text="AKADEMİK ANKET KONTROL PANELİ ✦", 
            font=(font_family_serif, 16, "bold"), 
            bg=BG_CANVAS, 
            fg=COLOR_INK
        )
        title_label.pack(side=tk.LEFT)

        # Top Control Panel Card
        control_card = tk.Frame(main_frame, bg=BG_CARD, bd=1, relief=tk.SOLID, highlightbackground=COLOR_PEBBLE, highlightcolor=COLOR_PEBBLE, padx=20, pady=20)
        control_card.pack(fill=tk.X, pady=(0, 15))

        # Status Line
        status_frame = tk.Frame(control_card, bg=BG_CARD)
        status_frame.pack(fill=tk.X, pady=(0, 10))

        status_title = tk.Label(status_frame, text="SUNUCU DURUMU:", font=(font_family_sans, 10, "bold"), bg=BG_CARD, fg=COLOR_ASHEN)
        status_title.pack(side=tk.LEFT)

        # Status Circle Indicator
        self.status_canvas = tk.Canvas(status_frame, width=16, height=16, bg=BG_CARD, bd=0, highlightthickness=0)
        self.status_canvas.pack(side=tk.LEFT, padx=(8, 4))
        self.status_circle = self.status_canvas.create_oval(2, 2, 14, 14, fill=COLOR_CLAY)

        self.status_text = tk.Label(status_frame, text="KAPALI", font=(font_family_sans, 10, "bold"), bg=BG_CARD, fg=COLOR_CLAY)
        self.status_text.pack(side=tk.LEFT)

        # Buttons Frame
        btn_frame = tk.Frame(control_card, bg=BG_CARD)
        btn_frame.pack(fill=tk.X, pady=(10, 0))

        self.btn_start = tk.Button(
            btn_frame, 
            text="SUNUCUYU BAŞLAT", 
            font=(font_family_sans, 9, "bold"),
            bg=COLOR_INK, 
            fg=BG_CARD, 
            activebackground=COLOR_INK,
            activeforeground=BG_CARD,
            padx=15, 
            pady=8,
            bd=0,
            cursor="hand2",
            command=self.start_server
        )
        self.btn_start.pack(side=tk.LEFT, padx=(0, 10))

        self.btn_stop = tk.Button(
            btn_frame, 
            text="SUNUCUYU DURDUR", 
            font=(font_family_sans, 9, "bold"),
            bg=BG_CANVAS, 
            fg=COLOR_ASHEN, 
            activebackground=BG_CANVAS,
            activeforeground=COLOR_ASHEN,
            padx=15, 
            pady=8,
            bd=1,
            relief=tk.SOLID,
            cursor="hand2",
            state=tk.DISABLED,
            command=self.stop_server
        )
        self.btn_stop.pack(side=tk.LEFT, padx=(0, 10))

        self.btn_admin = tk.Button(
            btn_frame, 
            text="YÖNETİCİ PANELİNİ AÇ", 
            font=(font_family_sans, 9, "bold"),
            bg=BG_CARD, 
            fg=COLOR_INK, 
            activebackground=COLOR_PEBBLE,
            activeforeground=COLOR_INK,
            padx=15, 
            pady=8,
            bd=1,
            relief=tk.SOLID,
            cursor="hand2",
            state=tk.DISABLED,
            command=self.open_admin_panel
        )
        self.btn_admin.pack(side=tk.LEFT)

        # Access Links Card
        self.links_card = tk.Frame(main_frame, bg=BG_CARD, bd=1, relief=tk.SOLID, highlightbackground=COLOR_PEBBLE, highlightcolor=COLOR_PEBBLE, padx=20, pady=20)
        self.links_card.pack(fill=tk.X, pady=(0, 15))

        links_title = tk.Label(self.links_card, text="ÖĞRENCİ ERİŞİM ADRESİ (MOBİL VERİ UYUMLU):", font=(font_family_sans, 8, "bold"), bg=BG_CARD, fg=COLOR_ASHEN)
        links_title.pack(anchor=tk.W, pady=(0, 4))

        self.link_url_label = tk.Label(self.links_card, text="Sunucu başlatılmadı", font=(font_family_sans, 12, "bold"), bg=BG_CARD, fg=COLOR_ASHEN)
        self.link_url_label.pack(anchor=tk.W, pady=(0, 10))

        self.btn_copy = tk.Button(
            self.links_card, 
            text="LİNKİ KOPYALA", 
            font=(font_family_sans, 8, "bold"),
            bg=BG_CARD, 
            fg=COLOR_INK, 
            activebackground=COLOR_PEBBLE,
            activeforeground=COLOR_INK,
            padx=10, 
            pady=5,
            bd=1,
            relief=tk.SOLID,
            cursor="hand2",
            state=tk.DISABLED,
            command=self.copy_link
        )
        self.btn_copy.pack(anchor=tk.W)

        # Console Logs Frame
        console_frame = tk.Frame(main_frame, bg=BG_CANVAS)
        console_frame.pack(fill=tk.BOTH, expand=True)

        console_title = tk.Label(console_frame, text="SİSTEM GÜNLÜKLERİ (LOGS):", font=(font_family_sans, 8, "bold"), bg=BG_CANVAS, fg=COLOR_ASHEN)
        console_title.pack(anchor=tk.W, pady=(0, 4))

        self.console = scrolledtext.ScrolledText(
            console_frame, 
            bg=BG_CARD, 
            fg=COLOR_INK, 
            font=("Courier", 9), 
            bd=1, 
            relief=tk.SOLID
        )
        self.console.pack(fill=tk.BOTH, expand=True)
        self.log_message("Kontrol paneli hazır. Sunucuyu başlatmak için 'SUNUCUYU BAŞLAT' butonuna tıklayın.")

    def log_message(self, message):
        self.console.config(state=tk.NORMAL)
        self.console.insert(tk.END, message + "\n")
        self.console.see(tk.END)
        self.console.config(state=tk.DISABLED)

    def start_server(self):
        if self.is_running:
            return

        self.is_running = True
        self.btn_start.config(state=tk.DISABLED)
        self.btn_stop.config(state=tk.NORMAL)
        
        self.status_canvas.itemconfig(self.status_circle, fill=COLOR_CLAY)
        self.status_text.config(text="BAŞLATILIYOR...", fg=COLOR_CLAY)

        # Clear console
        self.console.config(state=tk.NORMAL)
        self.console.delete(1.0, tk.END)
        self.console.config(state=tk.DISABLED)

        self.log_message("⏳ Sunucu başlatılıyor, lütfen bekleyin (Next.js derleniyor)...")

        # Run start.sh in separate thread
        self.output_thread = threading.Thread(target=self.run_server_process)
        self.output_thread.daemon = True
        self.output_thread.start()

        # Start a thread to watch public_url.txt
        watch_thread = threading.Thread(target=self.watch_public_url)
        watch_thread.daemon = True
        watch_thread.start()

    def run_server_process(self):
        try:
            # Run start.sh with a new process group so we can terminate it and all child processes cleanly
            self.server_process = subprocess.Popen(
                ["./start.sh"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                preexec_fn=os.setsid
            )

            for line in iter(self.server_process.stdout.readline, ""):
                self.log_message(line.strip())

            self.server_process.stdout.close()
            return_code = self.server_process.wait()
            self.log_message(f"\n[Sistem] Sunucu çıkış kodu ile sonlandı: {return_code}")
        except Exception as e:
            self.log_message(f"\n[Sistem Hatası] Sunucu başlatılamadı: {str(e)}")
        finally:
            self.root.after(0, self.handle_server_stopped)

    def watch_public_url(self):
        # Periodically check for public_url.txt
        url_file = "public_url.txt"
        while self.is_running:
            if os.path.exists(url_file):
                try:
                    with open(url_file, "r") as f:
                        url = f.read().strip()
                        if url.startswith("http"):
                            self.root.after(0, lambda u=url: self.handle_url_found(u))
                            break
                except Exception:
                    pass
            time.sleep(1)

    def handle_url_found(self, url):
        self.status_canvas.itemconfig(self.status_circle, fill=COLOR_GREEN)
        self.status_text.config(text="AKTİF", fg=COLOR_GREEN)
        self.link_url_label.config(text=url, fg=COLOR_CLAY)
        self.btn_copy.config(state=tk.NORMAL)
        self.btn_admin.config(state=tk.NORMAL)

    def handle_server_stopped(self):
        self.is_running = False
        self.server_process = None
        self.btn_start.config(state=tk.NORMAL)
        self.btn_stop.config(state=tk.DISABLED)
        self.btn_admin.config(state=tk.DISABLED)
        self.btn_copy.config(state=tk.DISABLED)
        
        self.status_canvas.itemconfig(self.status_circle, fill=COLOR_CLAY)
        self.status_text.config(text="KAPALI", fg=COLOR_CLAY)
        
        self.link_url_label.config(text="Sunucu başlatıldı değil", fg=COLOR_ASHEN)

    def stop_server(self):
        if not self.is_running:
            return

        self.log_message("\n⏳ Sunucu durduruluyor...")
        if self.server_process:
            try:
                # Send SIGTERM to the process group
                os.killpg(os.getpgid(self.server_process.pid), signal.SIGTERM)
            except Exception as e:
                self.log_message(f"Durdurma hatası: {str(e)}")
        
        # Clean up files manually just in case
        for f in ["public_url.txt", "lhr.log"]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass

        self.handle_server_stopped()
        self.log_message("✅ Sunucu başarıyla durduruldu.")

    def open_admin_panel(self):
        webbrowser.open("http://localhost:3000/dashboard")

    def copy_link(self):
        url = self.link_url_label.cget("text")
        if url and url.startswith("http"):
            self.root.clipboard_clear()
            self.root.clipboard_append(url)
            messagebox.showinfo("Başarılı", "Erişim adresi panoya kopyalandı!")

    def on_closing(self):
        if self.is_running:
            if messagebox.askokcancel("Çıkış", "Sunucu hala çalışıyor. Kapatmak istediğinize emin misiniz?"):
                self.stop_server()
                self.root.destroy()
        else:
            self.root.destroy()

if __name__ == "__main__":
    # Ensure working directory is same as the script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    root = tk.Tk()
    app = ControlPanelApp(root)
    root.mainloop()
