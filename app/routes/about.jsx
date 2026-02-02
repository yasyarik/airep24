import { data } from "react-router";

const json = data;

export const loader = async () => {
    return json({});
};

export default function About() {
    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Hero Section */}
            <section style={{ textAlign: 'center', marginBottom: '60px', padding: '60px 20px', background: 'linear-gradient(135deg, #008060 0%, #004c3f 100%)', borderRadius: '16px', color: 'white' }}>
                <h1 style={{ fontSize: '48px', marginBottom: '20px', fontWeight: 'bold' }}>My UGC Studio</h1>
                <p style={{ fontSize: '24px', marginBottom: '30px', opacity: 0.9 }}>
                    AI-Powered UGC Content Generation for Shopify
                </p>
                <p style={{ fontSize: '18px', maxWidth: '700px', margin: '0 auto 40px', lineHeight: '1.6', opacity: 0.85 }}>
                    Transform your product images into professional user-generated content with AI.
                    Create authentic-looking lifestyle photos featuring models wearing or using your products in seconds.
                </p>
                <a
                    href="https://apps.shopify.com/my-ugc-studio"
                    style={{
                        display: 'inline-block',
                        padding: '16px 32px',
                        background: 'white',
                        color: '#008060',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                >
                    Install on Shopify
                </a>
            </section>

            {/* Key Benefits */}
            <section style={{ marginBottom: '60px' }}>
                <h2 style={{ fontSize: '36px', textAlign: 'center', marginBottom: '40px' }}>Why Choose My UGC Studio?</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                    <div style={{ padding: '30px', background: '#f6f6f7', borderRadius: '12px', border: '1px solid #e1e3e5' }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚡</div>
                        <h3 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: 'bold' }}>Lightning Fast</h3>
                        <p style={{ lineHeight: '1.6', color: '#666' }}>
                            Generate professional UGC-style images in seconds. No photoshoots, no models, no studio time required.
                        </p>
                    </div>

                    <div style={{ padding: '30px', background: '#f6f6f7', borderRadius: '12px', border: '1px solid #e1e3e5' }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>💰</div>
                        <h3 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: 'bold' }}>Cost-Effective</h3>
                        <p style={{ lineHeight: '1.6', color: '#666' }}>
                            Save thousands on photoshoots and model fees. Start free with 10 credits, upgrade as you grow.
                        </p>
                    </div>

                    <div style={{ padding: '30px', background: '#f6f6f7', borderRadius: '12px', border: '1px solid #e1e3e5' }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎨</div>
                        <h3 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: 'bold' }}>Fully Customizable</h3>
                        <p style={{ lineHeight: '1.6', color: '#666' }}>
                            Choose from preset models and locations or create your own. Generate multiple angles for variety.
                        </p>
                    </div>

                    <div style={{ padding: '30px', background: '#f6f6f7', borderRadius: '12px', border: '1px solid #e1e3e5' }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔒</div>
                        <h3 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: 'bold' }}>Secure & Private</h3>
                        <p style={{ lineHeight: '1.6', color: '#666' }}>
                            Your data is encrypted and secure. We only collect what's necessary via Shopify API.
                        </p>
                    </div>

                    <div style={{ padding: '30px', background: '#f6f6f7', borderRadius: '12px', border: '1px solid #e1e3e5' }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📈</div>
                        <h3 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: 'bold' }}>Boost Conversions</h3>
                        <p style={{ lineHeight: '1.6', color: '#666' }}>
                            Authentic-looking UGC content increases trust and drives more sales for your products.
                        </p>
                    </div>

                    <div style={{ padding: '30px', background: '#f6f6f7', borderRadius: '12px', border: '1px solid #e1e3e5' }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🚀</div>
                        <h3 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: 'bold' }}>Shopify Integration</h3>
                        <p style={{ lineHeight: '1.6', color: '#666' }}>
                            Save generated images directly to your Shopify products with one click. Seamless workflow.
                        </p>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section style={{ marginBottom: '60px', padding: '60px 20px', background: '#f9fafb', borderRadius: '16px' }}>
                <h2 style={{ fontSize: '36px', textAlign: 'center', marginBottom: '40px' }}>Simple, Transparent Pricing</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>

                    <div style={{ padding: '30px', background: 'white', borderRadius: '12px', border: '2px solid #e1e3e5', textAlign: 'center' }}>
                        <h3 style={{ fontSize: '24px', marginBottom: '10px', fontWeight: 'bold' }}>FREE</h3>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#008060', marginBottom: '10px' }}>$0</div>
                        <p style={{ color: '#666', marginBottom: '20px' }}>10 credits/month</p>
                        <ul style={{ textAlign: 'left', lineHeight: '2', color: '#666', listStyle: 'none', padding: 0 }}>
                            <li>✓ All features</li>
                            <li>✓ Watermarked images</li>
                            <li>✓ Email support</li>
                        </ul>
                    </div>

                    <div style={{ padding: '30px', background: 'white', borderRadius: '12px', border: '2px solid #008060', textAlign: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#008060', color: 'white', padding: '4px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                            POPULAR
                        </div>
                        <h3 style={{ fontSize: '24px', marginBottom: '10px', fontWeight: 'bold' }}>BASIC</h3>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#008060', marginBottom: '10px' }}>$48</div>
                        <p style={{ color: '#666', marginBottom: '20px' }}>100 credits/month</p>
                        <ul style={{ textAlign: 'left', lineHeight: '2', color: '#666', listStyle: 'none', padding: 0 }}>
                            <li>✓ 100 image generations</li>
                            <li>✓ All features</li>
                            <li>✓ No watermark</li>
                            <li>✓ Standard support</li>
                        </ul>
                    </div>

                    <div style={{ padding: '30px', background: 'white', borderRadius: '12px', border: '2px solid #e1e3e5', textAlign: 'center' }}>
                        <h3 style={{ fontSize: '24px', marginBottom: '10px', fontWeight: 'bold' }}>PRO</h3>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#008060', marginBottom: '10px' }}>$199</div>
                        <p style={{ color: '#666', marginBottom: '20px' }}>500 credits/month</p>
                        <ul style={{ textAlign: 'left', lineHeight: '2', color: '#666', listStyle: 'none', padding: 0 }}>
                            <li>✓ 500 image generations</li>
                            <li>✓ All features</li>
                            <li>✓ No watermark</li>
                            <li>✓ Priority support</li>
                        </ul>
                    </div>

                    <div style={{ padding: '30px', background: 'white', borderRadius: '12px', border: '2px solid #e1e3e5', textAlign: 'center' }}>
                        <h3 style={{ fontSize: '24px', marginBottom: '10px', fontWeight: 'bold' }}>EXPERT</h3>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#008060', marginBottom: '10px' }}>$599</div>
                        <p style={{ color: '#666', marginBottom: '20px' }}>2000 credits/month</p>
                        <ul style={{ textAlign: 'left', lineHeight: '2', color: '#666', listStyle: 'none', padding: 0 }}>
                            <li>✓ 2000 image generations</li>
                            <li>✓ All features</li>
                            <li>✓ No watermark</li>
                            <li>✓ Dedicated manager</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section style={{ textAlign: 'center', padding: '60px 20px', background: 'linear-gradient(135deg, #004c3f 0%, #008060 100%)', borderRadius: '16px', color: 'white' }}>
                <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Ready to Transform Your Product Images?</h2>
                <p style={{ fontSize: '18px', marginBottom: '30px', opacity: 0.9 }}>
                    Start creating professional UGC content today. No credit card required for FREE plan.
                </p>
                <a
                    href="https://apps.shopify.com/my-ugc-studio"
                    style={{
                        display: 'inline-block',
                        padding: '16px 32px',
                        background: 'white',
                        color: '#008060',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        marginRight: '15px'
                    }}
                >
                    Get Started Free
                </a>
                <a
                    href="/support"
                    style={{
                        display: 'inline-block',
                        padding: '16px 32px',
                        background: 'transparent',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        border: '2px solid white'
                    }}
                >
                    Contact Support
                </a>
            </section>

            {/* Footer Links */}
            <footer style={{ marginTop: '60px', paddingTop: '40px', borderTop: '1px solid #e1e3e5', textAlign: 'center' }}>
                <div style={{ marginBottom: '20px' }}>
                    <a href="/privacy" style={{ color: '#008060', margin: '0 15px', textDecoration: 'none' }}>Privacy Policy</a>
                    <a href="/terms" style={{ color: '#008060', margin: '0 15px', textDecoration: 'none' }}>Terms of Service</a>
                    <a href="/support" style={{ color: '#008060', margin: '0 15px', textDecoration: 'none' }}>Support</a>
                </div>
                <p style={{ color: '#666', fontSize: '14px' }}>
                    © 2024 YAS S.p.z.o.o. • UL. SZLAK 77-222, PL-31-153, KRAKOW, POLAND
                </p>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
                    <a href="mailto:info@myugc.studio" style={{ color: '#008060', textDecoration: 'none' }}>info@myugc.studio</a>
                </p>
            </footer>
        </div>
    );
}
