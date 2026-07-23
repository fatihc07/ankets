#!/bin/bash

# Change directory to the script's directory
cd "$(dirname "$0")"

echo "========================================================"
echo "    AKADEMİK ANKET SİSTEMİ BAŞLATILIYOR"
echo "========================================================"
echo ""

# Terminate any existing processes running on port 3000
echo "🧹 Liman 3000 kontrol ediliyor ve temizleniyor..."
lsof -ti :3000 | xargs kill -9 2>/dev/null
sleep 1

# Build the Next.js application in production mode
echo "📦 Next.js uygulaması derleniyor (Üretim Modu - Hızlı Yükleme)..."
npm run build > build.log 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Derleme hatası oluştu! Detayları görmek için 'build.log' dosyasını inceleyin."
    exit 1
fi
echo "✅ Derleme başarıyla tamamlandı!"
echo ""

# Start Next.js server in production mode
echo "🚀 1. Next.js üretim sunucusu başlatılıyor..."
npm run start -- -H 0.0.0.0 > next.log 2>&1 &
NEXT_PID=$!

# Wait for local server to spin up
echo "⏳ Sunucunun hazır olması bekleniyor..."
while ! lsof -i:3000 -t >/dev/null; do
    sleep 0.5
done
echo "✅ Üretim sunucusu hazır!"
echo ""

# Start serveo.net and write output to a log file
echo "🔗 2. Öğrenci erişim tüneli (serveo) kuruluyor..."
rm -f lhr.log public_url.txt 2>/dev/null
ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:3000 serveo.net > lhr.log 2>&1 &
LT_PID=$!

# Wait for the url to appear in the log file
while ! grep -q "Forwarding HTTP traffic from" lhr.log; do
    sleep 0.5
    # If the process died, break to prevent infinite loop
    if ! kill -0 $LT_PID 2>/dev/null; then
        echo "❌ Tünel sunucusu başlatılamadı!"
        break
    fi
done

# Extract the URL from the log file
if grep -q "Forwarding HTTP traffic from" lhr.log; then
    LT_URL=$(grep "Forwarding HTTP traffic from" lhr.log | grep -o 'https://[a-zA-Z0-9.-]*')
    echo "========================================================"
    echo "  ÖĞRENCİ ERİŞİM ADRESİ (MOBİL VERİ UYUMLU):"
    echo "  $LT_URL"
    echo "========================================================"
    echo ""
    echo "========================================================"
    echo "  AKADEMİSYEN GİRİŞ ADRESİ (YÖNETİM PANELİ):"
    echo "  Yerel Erişim (Bilgisayarınızdan): http://localhost:3000"
    echo "  Dış Erişim (Mobil Cihazlardan)  : $LT_URL/login"
    echo "========================================================"
    echo ""
    echo $LT_URL > public_url.txt
fi

# Function to clean up background processes on exit
cleanup() {
    echo ""
    echo "Kapatılıyor... Lütfen bekleyin."
    kill $NEXT_PID 2>/dev/null
    kill $LT_PID 2>/dev/null
    rm -f lhr.log public_url.txt 2>/dev/null
    exit
}

# Capture exit signals
trap cleanup INT TERM EXIT

# Wait in the foreground to keep the terminal open
echo "Programı sonlandırmak için Ctrl+C tuşlarına basın."
wait $NEXT_PID
