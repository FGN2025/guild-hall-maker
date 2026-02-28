import { Link } from "react-router-dom";
import { ArrowLeft, Gamepad2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const DisabledUsersNotice = () => {
  const handleDownload = () => window.print();

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
              Disabled Users Notice
            </h1>
          </div>

          <div className="flex items-center justify-between mb-8">
            <p className="text-sm text-muted-foreground">Last Updated: February 28, 2026</p>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2 print:hidden">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>

          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/90 font-body">
            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">1. Our Commitment to Accessibility</h2>
              <p>
                Fiber Gaming Network ("FGN," "we," "us," or "our") is committed to ensuring that our platform and Services are accessible to all users, including those with disabilities. We strive to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards to provide an inclusive and equitable experience for everyone.
              </p>
              <p className="mt-2">
                We continuously work to improve the accessibility of our platform and welcome feedback from our users to help us identify areas for improvement.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">2. Accessibility Features</h2>
              <p className="mb-2">FGN incorporates the following accessibility features:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Keyboard Navigation:</strong> Our platform is designed to be fully navigable using a keyboard alone.</li>
                <li><strong>Screen Reader Compatibility:</strong> We use semantic HTML, ARIA labels, and proper heading structures to ensure compatibility with popular screen readers.</li>
                <li><strong>Color Contrast:</strong> We maintain sufficient color contrast ratios to ensure readability for users with low vision or color vision deficiencies.</li>
                <li><strong>Responsive Design:</strong> Our platform adapts to various screen sizes and zoom levels to accommodate different viewing preferences.</li>
                <li><strong>Alt Text:</strong> Images include descriptive alternative text where applicable.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">3. Assistive Technology Compatibility</h2>
              <p>
                Our platform is designed to work with a variety of assistive technologies, including but not limited to:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Screen readers (JAWS, NVDA, VoiceOver)</li>
                <li>Screen magnification software</li>
                <li>Speech recognition software</li>
                <li>Alternative input devices (switch devices, eye-tracking systems)</li>
              </ul>
              <p className="mt-2">
                If you experience difficulty using any assistive technology with our platform, please contact us so we can work to resolve the issue.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">4. Account Suspension and Disability</h2>
              <p>
                In certain circumstances, user accounts may be suspended or disabled due to violations of our Terms and Conditions or Acceptable Use Policy. If your account has been suspended or disabled:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Notification:</strong> You will receive an email notification explaining the reason for the suspension and its duration (if temporary).</li>
                <li><strong>Appeal Process:</strong> You have the right to appeal any account suspension or disability by contacting us at the email address below within 30 days of receiving the notification.</li>
                <li><strong>Review:</strong> Appeals are reviewed by a member of our moderation team who was not involved in the original decision. We aim to respond to appeals within 10 business days.</li>
                <li><strong>Data Access:</strong> Even if your account is permanently disabled, you may request a copy of your personal data in accordance with our Privacy Policy.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">5. Requesting Accommodations</h2>
              <p>
                If you require specific accommodations to participate in FGN tournaments, community events, or to use our platform effectively, please contact us. We will work with you on a case-by-case basis to provide reasonable accommodations that enable your full participation.
              </p>
              <p className="mt-2">Accommodations may include but are not limited to:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Extended time limits for tournament check-ins or match submissions</li>
                <li>Alternative communication methods for tournament coordination</li>
                <li>Adjustments to platform features to improve accessibility</li>
                <li>Providing information in alternative formats upon request</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">6. Known Limitations</h2>
              <p>
                While we strive for full accessibility, some third-party content or integrations (such as Discord, external game platforms, or embedded media) may not be fully accessible. We are unable to control the accessibility of third-party services but will advocate for improvements where possible.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">7. Feedback and Contact</h2>
              <p>
                We welcome your feedback on the accessibility of our platform. If you encounter any accessibility barriers, have suggestions for improvement, or need to request accommodations, please contact us at:{" "}
                <a href="mailto:accessibility@fibergamingnetwork.com" className="text-primary hover:underline">
                  accessibility@fibergamingnetwork.com
                </a>
              </p>
              <p className="mt-2">
                When contacting us, please include a description of the accessibility issue, the page or feature affected, and your preferred method of contact so we can assist you effectively.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">8. Changes to This Notice</h2>
              <p>
                We may update this Disabled Users Notice from time to time. If we make material changes, we will notify you by updating the date at the top of this notice or through a prominent notice on the Site. Your continued use of the Services after such changes constitutes your acceptance of the updated notice.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisabledUsersNotice;
