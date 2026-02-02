import { data } from "react-router";

const json = data;

export const loader = async () => {
    return json({});
};

export default function Support() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>Support & Contact</h1>
            <p style={{ color: '#666', marginBottom: '30px', fontSize: '18px' }}>
                We're here to help! Get in touch with our support team.
            </p>

            <section style={{ marginBottom: '40px', padding: '30px', background: '#f6f6f7', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>📧 Email Support</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    For technical issues, billing questions, or general inquiries:
                </p>
                <p style={{ fontSize: '18px' }}>
                    <a href="mailto:info@myugc.studio" style={{ color: '#008060', fontWeight: 'bold' }}>info@myugc.studio</a>
                </p>
                <p style={{ color: '#666', marginTop: '10px', fontSize: '14px' }}>
                    ⏱ Average response time: 48 hours (PRO/EXPERT plans: priority support)
                </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>❓ Frequently Asked Questions</h2>


                <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '10px', fontWeight: 'bold' }}>Can I remove the watermark?</h3>
                    <p style={{ lineHeight: '1.6', color: '#666' }}>
                        Watermarks are only added to images generated on the FREE plan. Upgrade to BASIC, PRO, or EXPERT
                        to generate watermark-free images suitable for commercial use.
                    </p>
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '10px', fontWeight: 'bold' }}>What image formats are supported?</h3>
                    <p style={{ lineHeight: '1.6', color: '#666' }}>
                        We support JPG, PNG, and WebP formats. Generated images (final photos, models, and locations) are provided in high-quality portrait format (768x1344 pixels, 9:16 aspect ratio).
                    </p>
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '10px', fontWeight: 'bold' }}>Can I use custom models and backgrounds?</h3>
                    <p style={{ lineHeight: '1.6', color: '#666' }}>
                        Yes! You can upload your own model photos or generate custom models using AI. You can also create custom backgrounds
                        or use our preset locations.
                    </p>
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '10px', fontWeight: 'bold' }}>How do I cancel my subscription?</h3>
                    <p style={{ lineHeight: '1.6', color: '#666' }}>
                        You can cancel anytime from your Shopify admin. Your subscription will remain active until the end of the current billing period.
                    </p>
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '10px', fontWeight: 'bold' }}>Is my data secure?</h3>
                    <p style={{ lineHeight: '1.6', color: '#666' }}>
                        Yes! We use industry-standard encryption and security measures. Your product images are processed securely and
                        stored only for the duration of your subscription. See our <a href="/privacy" style={{ color: '#008060' }}>Privacy Policy</a> for details.
                    </p>
                </div>
            </section>

            <section style={{ marginBottom: '40px', padding: '30px', background: '#e3f2ed', borderRadius: '8px', border: '1px solid #008060' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>💡 Tips for Best Results</h2>
                <ul style={{ lineHeight: '1.8', marginLeft: '20px' }}>
                    <li>Use high-quality product images with clear backgrounds</li>
                    <li>For clothing items, select "Clothing" product type for best fit</li>
                    <li>For items to be held, select "Item" and choose the appropriate action</li>
                    <li>Experiment with different models and locations to find your style</li>
                    <li>Generate multiple angles for variety in your product listings</li>
                </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>🔗 Useful Links</h2>
                <ul style={{ lineHeight: '2', listStyle: 'none', padding: 0 }}>
                    <li>
                        <a href="/privacy" style={{ color: '#008060', fontSize: '16px' }}>Privacy Policy →</a>
                    </li>
                    <li>
                        <a href="/terms" style={{ color: '#008060', fontSize: '16px' }}>Terms of Service →</a>
                    </li>
                    <li>
                        <a href="https://shopify.myugc.studio" target="_blank" rel="noopener noreferrer" style={{ color: '#008060', fontSize: '16px' }}>
                            Official Website →
                        </a>
                    </li>
                </ul>
            </section>

            <section style={{ padding: '30px', background: '#f6f6f7', borderRadius: '8px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Still have questions?</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '20px', color: '#666' }}>
                    Don't hesitate to reach out. We're happy to help!
                </p>
                <a
                    href="mailto:info@myugc.studio"
                    style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        background: '#008060',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold'
                    }}
                >
                    Contact Support
                </a>
            </section>
        </div>
    );
}
