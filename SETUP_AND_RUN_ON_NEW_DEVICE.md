# 🚀 Pico Assistant — Run on Another PC / Device Guide

This guide explains how to pull your code from your branch (`my-new-branch`) onto another computer and run the development app on your phone.

---

## 💻 Part 1: Setting up the Code on a New PC / Laptop

### 1. Prerequisites on the New PC
Make sure the new computer has:
* **Node.js** (v18 or v20 LTS recommended): [https://nodejs.org](https://nodejs.org)
* **Git**: [https://git-scm.com](https://git-scm.com)

---

### 2. Clone and Checkout Your Branch
Open your terminal (PowerShell, Command Prompt, or Terminal) and run:

```bash
# 1. Clone the repository
git clone https://github.com/Tamim2276/Pico.git

# 2. Enter the project folder
cd Pico

# 3. Switch to your active feature branch
git checkout my-new-branch

# 4. Pull the latest commits
git pull origin my-new-branch
```

---

### 3. Install Dependencies
```bash
npm install
```

---

### 4. Start the Metro Development Server
```bash
npx expo start
```

---

## 📱 Part 2: Connecting and Running on a Phone / Device

Because Pico uses high-performance native modules (like **`llama.rn`** for local AI and **`expo-secure-store`** for offline data), it runs inside an **Expo Development Build APK** (not standard Expo Go).

### Step 1: Install the Development Build APK on the Phone
* If the phone already has the **Pico** app installed, you are ready to connect!
* To install on a new phone:
  * Download the `tamim2276/pico` development build APK from your Expo dashboard or install the `.apk` file directly onto the phone.

---

### Step 2: Connect Phone to the Same Network
Make sure the **PC** and the **Phone** are on the same network:
* **Option A (Wi-Fi)**: Connect both PC and Phone to the same local Wi-Fi.
* **Option B (USB Tethering / Hotspot)**: Turn on Mobile Hotspot on the phone and connect your PC to it.

---

### Step 3: Launch and Connect
1. Open the **Pico** app on your phone.
2. In the terminal where you ran `npx expo start`, you will see a QR code and URL (e.g. `http://192.168.1.50:8081`).
3. In the Pico app:
   * Scan the QR code, OR
   * Tap **"Enter URL manually"** and type: `http://<YOUR_PC_IP>:8081`

---

### Step 4: First-Time On-Device AI Model Setup
1. Once the app loads, create an account or log in.
2. Navigate to the **Assistant** tab.
3. Tap the **`+`** icon next to the chat input to download the GGUF model (`gemma_3_1b_it_q4_k_m.gguf`) to the device's storage.
4. Once downloaded, Pico will initialize and run 100% offline! 🚀

---

## 🔄 Daily Workflow (How to Push & Pull Updates)

### On your Current PC (Pushing your work):
```bash
git add .
git commit -m "Your update message"
git push origin my-new-branch
```

### On the Other PC (Pulling the latest work):
```bash
git checkout my-new-branch
git pull origin my-new-branch
```
