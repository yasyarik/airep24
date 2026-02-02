import { data } from "react-router";

const json = data;

export const loader = async () => {
    return json({});
};

export default function Terms() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>Terms of Service</h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>Last updated: {new Date().toLocaleDateString()}</p>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>1. Acceptance of Terms</h2>
                <p style={{ lineHeight: '1.6' }}>
                    By installing and using My UGC Studio ("the Service"), you agree to be bound by these Terms of Service.
                    If you do not agree to these terms, please do not use the Service.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>2. Description of Service</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    My UGC Studio is a Shopify application that uses AI technology to generate user-generated content (UGC) style images
                    for your products. The Service allows you to:
                </p>
                <ul style={{ lineHeight: '1.8', marginLeft: '20px' }}>
                    <li>Generate AI-powered product images with models</li>
                    <li>Transform static images into 5-second AI videos</li>
                    <li>Create custom backgrounds and locations</li>
                    <li>Manage and download generated images and videos</li>
                    <li>Save images directly to your Shopify products</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>3. Credits and Billing</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    The Service operates on a credit-based system. Each generation consumes credits as follows:
                </p>
                <ul style={{ lineHeight: '1.8', marginLeft: '20px', marginBottom: '15px' }}>
                    <li><strong>Image Generation:</strong> 1 credit per image</li>
                    <li><strong>Video Generation:</strong> 5 credits per video</li>
                </ul>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    Monthly credit allotments per plan:
                </p>
                <ul style={{ lineHeight: '1.8', marginLeft: '20px', marginBottom: '15px' }}>
                    <li><strong>FREE Plan:</strong> 10 credits per month • Includes watermark on generated images</li>
                    <li><strong>BASIC Plan ($48/month):</strong> 100 credits per month • No watermark • Standard support</li>
                    <li><strong>PRO Plan ($199/month):</strong> 500 credits per month • No watermark • Priority support • Advanced features</li>
                    <li><strong>EXPERT Plan ($599/month):</strong> 2000 credits per month • No watermark • Priority support • All features • Dedicated account manager</li>
                </ul>
                <p style={{ lineHeight: '1.6', marginBottom: '10px' }}>
                    <strong>What's included in all paid plans:</strong>
                </p>
                <ul style={{ lineHeight: '1.8', marginLeft: '20px' }}>
                    <li>Watermark-free generated images</li>
                    <li>Commercial usage rights for all generated content</li>
                    <li>Custom model and location uploads</li>
                    <li>AI-generated custom models and backgrounds</li>
                    <li>Direct save to Shopify products</li>
                    <li>Batch image generation</li>
                    <li>Multiple angle generation (1-3 angles per product)</li>
                </ul>
                <p style={{ lineHeight: '1.6', marginTop: '15px', fontStyle: 'italic', color: '#666' }}>
                    Credits are consumed when generating images. Unused credits do not roll over to the next billing period.
                    Credits reset monthly on your billing date.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>4. Acceptable Use</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>You agree NOT to use the Service to:</p>
                <ul style={{ lineHeight: '1.8', marginLeft: '20px' }}>
                    <li>Generate illegal, harmful, or offensive content</li>
                    <li>Violate any intellectual property rights</li>
                    <li>Create misleading or deceptive content</li>
                    <li>Violate any applicable laws or regulations</li>
                </ul>
                <p style={{ lineHeight: '1.6', marginTop: '15px', fontStyle: 'italic', color: '#666' }}>
                    Note: Shopify's own policies govern what products can be sold on their platform. We rely on Shopify's content moderation
                    and do not impose additional product category restrictions beyond those required by law.
                </p>
                <p style={{ lineHeight: '1.6', marginTop: '10px' }}>
                    We reserve the right to suspend or terminate accounts that violate these terms.
                </p>
            </section>

            <section style={{ marginBottom: '30px', border: '2px solid #008060', borderRadius: '8px', padding: '20px', background: '#f6f6f7' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#008060' }}>5. AI Content Policy & Disclaimer</h2>

                <h3 style={{ fontSize: '18px', marginBottom: '10px', marginTop: '15px' }}>5.1 AI Technology</h3>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    This service uses <strong>Google Gemini AI</strong> for image generation. AI-generated results are created automatically
                    and may vary in quality and accuracy. We do not guarantee perfect results every time.
                </p>

                <h3 style={{ fontSize: '18px', marginBottom: '10px', marginTop: '15px' }}>5.2 Prohibited AI-Generated Content</h3>
                <p style={{ lineHeight: '1.6', marginBottom: '10px' }}>
                    In addition to the general acceptable use policy above, you specifically agree <strong>NOT</strong> to use our AI service to generate:
                </p>
                <ul style={{ lineHeight: '1.8', marginLeft: '20px', marginBottom: '15px' }}>
                    <li><strong>Nudity or Sexual Content:</strong> Any sexually explicit material, nudity, or pornographic content</li>
                    <li><strong>Lingerie, Underwear & Swimwear:</strong> Models wearing lingerie, underwear, swimwear, or revealing clothing. <em>Due to AI model limitations (Google Gemini), such content is not supported and will likely fail to generate.</em></li>
                    <li><strong>Violence & Hate Speech:</strong> Content depicting violence, gore, hate speech, or harassment</li>
                    <li><strong>Deepfakes:</strong> Realistic depictions of real people without their explicit consent, especially for misleading purposes</li>
                    <li><strong>Illegal Activities:</strong> Content promoting or depicting illegal acts</li>
                    <li><strong>Deceptive Content:</strong> Images intended to mislead, deceive, or defraud others</li>
                    <li><strong>Minors:</strong> Any content involving minors in inappropriate contexts</li>
                </ul>

                <h3 style={{ fontSize: '18px', marginBottom: '10px', marginTop: '15px' }}>5.3 User Responsibility & Liability</h3>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    <strong>YOU ARE SOLELY RESPONSIBLE</strong> for all content you generate, publish, or distribute using our Service.
                    You represent and warrant that:
                </p>
                <ul style={{ lineHeight: '1.8', marginLeft: '20px', marginBottom: '15px' }}>
                    <li>You have the legal right to use all images you upload (product images, model images, etc.)</li>
                    <li>You will not use generated content in a way that violates any person's rights (privacy, publicity, intellectual property)</li>
                    <li>You will comply with all applicable laws and regulations when using generated content</li>
                    <li>You understand that AI-generated content may contain errors, inaccuracies, or unintended elements</li>
                </ul>

                <h3 style={{ fontSize: '18px', marginBottom: '10px', marginTop: '15px' }}>5.4 No Liability for AI Outputs</h3>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    YAS S.p.z.o.o. <strong>DISCLAIMS ALL LIABILITY</strong> for AI-generated outputs. We do not review, approve, or endorse
                    generated content. The AI model is provided by Google, and we have no control over its outputs. We are not responsible for:
                </p>
                <ul style={{ lineHeight: '1.8', marginLeft: '20px', marginBottom: '15px' }}>
                    <li>Accuracy, quality, or appropriateness of generated images</li>
                    <li>Any legal issues arising from your use of generated content</li>
                    <li>Copyright, trademark, or other intellectual property issues in generated images</li>
                    <li>Offensive, inappropriate, or harmful content that may be generated</li>
                </ul>

                <h3 style={{ fontSize: '18px', marginBottom: '10px', marginTop: '15px' }}>5.5 Data Processing & Third-Party AI</h3>
                <p style={{ lineHeight: '1.6' }}>
                    Your uploaded images are sent to <strong>Google's Gemini AI API</strong> for processing. By using this Service, you acknowledge
                    that your data will be processed by Google in accordance with their{' '}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#008060' }}>Privacy Policy</a>.
                    We do not store your images on Google's servers beyond the processing time required for generation.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>6. Intellectual Property</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
                    <strong>Your Content:</strong> You retain all rights to your product images and data. By using the Service,
                    you grant us a license to process your content solely for the purpose of providing the Service.
                </p>
                <p style={{ lineHeight: '1.6' }}>
                    <strong>Generated Images:</strong> You own the generated images and may use them for commercial purposes.
                    However, images generated on the FREE plan include a watermark that must not be removed.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>7. Service Availability</h2>
                <p style={{ lineHeight: '1.6' }}>
                    We strive to maintain 99% uptime but do not guarantee uninterrupted access to the Service.
                    We may perform maintenance, updates, or modifications that temporarily affect availability.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>8. Cancellations</h2>
                <p style={{ lineHeight: '1.6' }}>
                    You may cancel your subscription at any time from your Shopify admin. Your access will continue until the end
                    of the current billing period. No refunds are provided for partial billing periods.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>9. Limitation of Liability</h2>
                <p style={{ lineHeight: '1.6' }}>
                    The Service is provided "as is" without warranties of any kind. We are not liable for any damages arising from
                    your use of the Service, including but not limited to lost profits, data loss, or business interruption.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>10. Changes to Terms</h2>
                <p style={{ lineHeight: '1.6' }}>
                    We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.
                    We will notify you of significant changes via email or in-app notification.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>11. Contact Information</h2>
                <p style={{ lineHeight: '1.8' }}>
                    For questions about these Terms, please contact us at:<br />
                    <strong>Company:</strong> YAS S.p.z.o.o.<br />
                    <strong>Address:</strong> UL. SZLAK 77-222, PL-31-153, KRAKOW, POLAND<br />
                    <strong>Email:</strong> <a href="mailto:info@myugc.studio" style={{ color: '#008060' }}>info@myugc.studio</a><br />
                    <strong>Website:</strong> <a href="https://shopify.myugc.studio" style={{ color: '#008060' }}>https://shopify.myugc.studio</a>
                </p>
            </section>
        </div>
    );
}
