# AI-Based OTP Autofill Chrome Extension

This Chrome extension automates OTP filling and verification link handling using AI and Google Pub/Sub. It detects new emails in real-time, extracts OTPs or verification links, and helps fill forms or open verification links in new tabs automatically.

### Key Features:

- **Real-time email notifications** via Google Pub/Sub.
- **AI-based OTP extraction** and autofill.
- **Popup notifications** for OTPs and verification links.
- **Automatic verification link handling**, opens links in new tabs.

### Demo Preview:

[![Demo Video]](./preview/preview.mp4)

### Installation:

1. Clone the repo: `git clone https://github.com/sijan2/autofill-ai.git`
2. Load the extension in Chrome: Go to `chrome://extensions/`, enable "Developer mode," and select "Load unpacked."
3. Configure Google Pub/Sub with Gmail notifications.

### How It Works:

- On receiving a new email, the extension scans for OTPs or verification links and either autofills or provides popup notifications for easy interaction.

---

For more details, check out the full demo in the `preview/preview.mp4`.
