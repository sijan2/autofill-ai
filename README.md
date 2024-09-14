# AI-Based OTP Autofill Chrome Extension

This Chrome extension automates OTP filling and verification link handling using AI and Google Pub/Sub. It detects new otp/verifications related email, extracts OTPs or verification links, and open verification links in new tabs automatically.

### Key Features:

- **Real-time email notifications** via Google Pub/Sub.
- **AI-based OTP extraction** and autofill.
- **Popup notifications** for OTPs and verification links.
- **Automatic verification link handling**, opens links in new tabs.




### Demo Preview:
https://github.com/user-attachments/assets/5ef13a08-733a-4235-b467-5e87eb2d42b7



### Installation:

1. Clone the repo: `git clone https://github.com/sijan2/autofill-ai.git`
2. Load the extension in Chrome: Go to `chrome://extensions/`, enable "Developer mode," and select "Load unpacked."
3. Configure Google Pub/Sub with Gmail notifications.

### How It Works:

1. **Google Account Authentication**:
   - The extension first authenticates your Google account, asking for necessary permissions to access your Gmail inbox.
   - Once authenticated, it specifically watches emails under a designated label (e.g., "OTP" or "Verification") to ensure privacy and limit the scope of email access.

2. **Email Label Monitoring with Google Pub/Sub**:
   - A custom label is applied to emails that contain OTPs or verification links.
   - Google Pub/Sub is set up to monitor any changes in the labeled mailbox.
   - When a new email arrives or an existing labeled email is updated, Pub/Sub sends a **push notification** to a backend server (webhook) that you’ve configured.

3. **Instant Notifications via WebSockets**:
   - The webhook is connected to a WebSocket server that communicates directly with the Chrome extension.
   - As soon as a notification of a new email is received, the WebSocket sends the new email’s history ID to the Chrome extension in real time.

4. **Email Content Retrieval and AI Analysis**:
   - The Chrome extension, upon receiving the new history ID, automatically pulls the content of the email directly from Gmail (only for emails under the monitored label).
   - The email content is then sent to an AI model (using Google’s Gemini or similar models) to extract the following:
     - **OTP** (One-Time Password)
     - **Verification links**
     - **Password reset links**

5. **Displaying OTP and Links**:
   - Based on the AI model’s response, the extension displays a **popup notification** in the browser:
     - If an OTP is detected, it is displayed in the popup and can be automatically filled into any corresponding input field on the webpage.
     - If a verification link is detected (e.g., a password reset link), the popup provides an option to **open the link in a new tab**.

6. **Privacy-First Token Management**:
   - The extension handles all processes directly in the browser to ensure user privacy.
   - **Google authentication tokens** are kept exclusively in the client (your browser) and are never sent to the backend server, reducing the risk of token exposure.
