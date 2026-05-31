# FeedShift Privacy Policy

**Effective Date:** April 30, 2026

FeedShift ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how our Chrome Extension and associated services handle your data.

## 1. Information We Collect
The FeedShift extension operates primarily in your local browser environment. The only data we process includes:
- **YouTube Video Metadata:** Titles, channel names, and tags of videos appearing in your feed.
- **Account Information:** Profile interests, role (student/parent), and focus settings, which are securely stored in our Supabase database.

## 2. How We Use Your Information
- **Real-Time Classification:** Video metadata is sent to our backend to classify whether a video aligns with your educational interests using AI.
- **Service Improvement:** We log anonymous "block/allow" events to improve the accuracy of our classification engine and update your personal dashboard statistics.

## 3. Data Storage & Security
- **No Browsing History Stored:** We do not track or store your general web browsing history. The extension only activates on `youtube.com`.
- **Encryption:** All communication between the extension and our servers uses industry-standard HTTPS encryption.
- **Authentication:** User data is secured using Supabase Authentication and Row Level Security (RLS) policies.

## 4. Sharing Your Data
We do not sell, rent, or trade your personal information. Video metadata sent to our AI provider (OpenAI) is processed ephemerally and is not used to train public models, in accordance with OpenAI's API data usage policies.

## 5. Your Rights
You have the right to:
- Access the data we hold about you via your FeedShift Dashboard.
- Delete your account and associated data completely.
- Disable the extension at any time.

## 6. Contact Us
If you have questions about this Privacy Policy, please contact us at `support@feedshift.app`.
