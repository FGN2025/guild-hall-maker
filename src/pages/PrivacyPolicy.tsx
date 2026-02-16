import { Link } from "react-router-dom";
import { ArrowLeft, Gamepad2 } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background grid-bg">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="glass-panel rounded-xl p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <Gamepad2 className="h-8 w-8 text-primary" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-wide">
              Privacy Policy
            </h1>
          </div>

          <p className="text-sm text-muted-foreground mb-8">Last Updated: January 7, 2026</p>

          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/90 font-body">
            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">1. Information We Collect</h2>
              <p>
                Fiber Gaming Network ("FGN," "we," "us," or "our") collects information you provide directly to us when you create an account, participate in tournaments, interact with the community, or contact us for support. This may include:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Account Information:</strong> Email address, display name, gamer tag, ZIP code, and password.</li>
                <li><strong>Profile Information:</strong> Avatar, bio, linked Discord account, and gaming preferences.</li>
                <li><strong>Tournament Data:</strong> Match results, rankings, scores, and participation history.</li>
                <li><strong>Communications:</strong> Community posts, messages, and support requests.</li>
                <li><strong>Payment Information:</strong> If applicable, billing details for entry fees or prizes (processed through third-party payment providers).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">2. Information Collected Automatically</h2>
              <p>When you access or use our Services, we automatically collect certain information, including:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Device Information:</strong> Hardware model, operating system, browser type, and unique device identifiers.</li>
                <li><strong>Log Data:</strong> IP address, access times, pages viewed, and referring URL.</li>
                <li><strong>Usage Data:</strong> Features used, actions taken, and interaction patterns within the platform.</li>
                <li><strong>Cookies & Similar Technologies:</strong> We use cookies and similar tracking technologies to collect and store information about your preferences and activity.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Provide, maintain, and improve our Services.</li>
                <li>Process tournament registrations, track results, and distribute prizes.</li>
                <li>Send you technical notices, updates, security alerts, and administrative messages.</li>
                <li>Respond to your comments, questions, and customer service requests.</li>
                <li>Monitor and analyze trends, usage, and activities in connection with our Services.</li>
                <li>Detect, investigate, and prevent fraudulent transactions, cheating, and other illegal activities.</li>
                <li>Personalize and improve your experience on the platform.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">4. Sharing of Information</h2>
              <p>We may share information about you as follows:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Partner ISPs:</strong> We may share limited information (such as ZIP code and account status) with Partner Internet Service Providers to verify your eligibility for premium features.</li>
                <li><strong>Public Profiles:</strong> Your gamer tag, avatar, tournament results, and rankings may be publicly visible to other users.</li>
                <li><strong>Service Providers:</strong> We may share information with third-party vendors who perform services on our behalf, such as hosting, analytics, and payment processing.</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law, regulation, or legal process.</li>
                <li><strong>Business Transfers:</strong> In connection with any merger, acquisition, or sale of assets, your information may be transferred.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">5. Data Security</h2>
              <p>
                We take reasonable measures to help protect information about you from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction. However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee the absolute security of your data.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">6. Data Retention</h2>
              <p>
                We retain your personal information for as long as your account is active or as needed to provide you Services. We may also retain and use your information to comply with our legal obligations, resolve disputes, and enforce our agreements. If you request deletion of your account, we will delete or anonymize your data within 30 days, except where retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">7. Your Rights and Choices</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Access & Update:</strong> You can access and update your account information through your Profile Settings at any time.</li>
                <li><strong>Delete Account:</strong> You may request deletion of your account by contacting us at the email below.</li>
                <li><strong>Opt-Out of Communications:</strong> You may opt out of promotional emails by following the unsubscribe link in those messages. You cannot opt out of transactional or administrative emails.</li>
                <li><strong>Cookies:</strong> Most web browsers are set to accept cookies by default. You can usually modify your browser settings to decline cookies if you prefer.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">8. Children's Privacy</h2>
              <p>
                Our Services are not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will take steps to delete such information promptly.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">9. Third-Party Links</h2>
              <p>
                Our Services may contain links to third-party websites and services (such as Discord, game platforms, and streaming services). We are not responsible for the privacy practices of these third parties. We encourage you to read the privacy policies of any third-party services you visit.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. If we make material changes, we will notify you by updating the date at the top of this policy or through a prominent notice on the Site. Your continued use of the Services after such changes constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">11. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at:{" "}
                <a href="mailto:privacy@fibergamingnetwork.com" className="text-primary hover:underline">
                  privacy@fibergamingnetwork.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
