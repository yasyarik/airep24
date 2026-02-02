import { data } from "react-router";

const json = data;

export const loader = async () => {
    return json({});
};

export default function Privacy() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>Privacy Policy</h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>Last updated: {new Date().toLocaleDateString()}</p>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>1. Information We Collect</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    My UGC Studio ("we", "our", or "us"), operated by YAS S.p.z.o.o., collects and processes the following information when you use our Shopify application:
                </p>
                <ul style={{ lineHeight: '1.8', marginLeft: '20px' }}>
                    <li><strong>Shop Information:</strong> Your Shopify store domain and basic store details provided by Shopify API</li>
                    <li><strong>Product Data:</strong> Product images, titles, and categories that you choose to process through our service</li>
                    <li><strong>Generated Content:</strong> AI-generated images created through our service, stored temporarily during your subscription</li>
                    <li><strong>Usage Data:</strong> Credits used, generation history, and subscription plan information</li>
                </ul>
                <p style={{ lineHeight: '1.6', marginTop: '15px', fontStyle: 'italic', color: '#666' }}>
                    We do not collect any personal information beyond what is provided by the Shopify API for app functionality.
                    We do not track, store, or share your browsing behavior or any data outside the scope of our service.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>2. How We Use Your Information</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>We use the collected information to:</p>
                <ul style={{ lineHeight: '1.8', marginLeft: '20px' }}>
                    <li>Provide and maintain our AI image generation service</li>
                    <li>Process your product images and generate UGC-style content</li>
                    <li>Manage your subscription and credit usage</li>
                    <li>Improve our service and develop new features</li>
                    <li>Communicate with you about service updates and support</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>3. Data Storage and Security</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    Your data is stored securely on our servers. Generated images and custom assets are stored for the duration of your subscription.
                    We implement industry-standard security measures to protect your information from unauthorized access, disclosure, or destruction.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>4. Third-Party Services</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    We use Google's Gemini AI API to generate images. Your product images are sent to Google's servers for processing.
                    Please review <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#008060' }}>Google's Privacy Policy</a> for more information.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>5. Data Retention</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    We retain your data for as long as your account is active. When you uninstall the app, your generated images and custom assets
                    are deleted within 30 days. Shop and usage information may be retained for accounting and legal purposes.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>6. Your Rights</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>You have the right to:</p>
                <ul style={{ lineHeight: '1.8', marginLeft: '20px' }}>
                    <li>Access your personal data</li>
                    <li>Request correction of inaccurate data</li>
                    <li>Request deletion of your data</li>
                    <li>Export your data</li>
                    <li>Withdraw consent for data processing</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>7. Contact Us</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    If you have any questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <p style={{ lineHeight: '1.8' }}>
                    <strong>Company:</strong> YAS S.p.z.o.o.<br />
                    <strong>Address:</strong> UL. SZLAK 77-222, PL-31-153, KRAKOW, POLAND<br />
                    <strong>Email:</strong> <a href="mailto:privacy@myugc.studio" style={{ color: '#008060' }}>privacy@myugc.studio</a><br />
                    <strong>Website:</strong> <a href="https://shopify.myugc.studio" style={{ color: '#008060' }}>https://shopify.myugc.studio</a>
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>8. Changes to This Policy</h2>
                <p style={{ lineHeight: '1.6' }}>
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page
                    and updating the "Last updated" date.
                </p>
            </section>
        </div>
    );
}
