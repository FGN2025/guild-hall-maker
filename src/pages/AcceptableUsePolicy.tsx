import { Link } from "react-router-dom";
import { ArrowLeft, Gamepad2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const AcceptableUsePolicy = () => {
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
              Acceptable Use Policy
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
              <h2 className="font-display text-lg font-bold text-foreground mb-2">1. Purpose</h2>
              <p>
                This Acceptable Use Policy ("AUP") outlines the rules and guidelines for using the Fiber Gaming Network ("FGN," "we," "us," or "our") platform, including our website, community features, tournaments, and related services (collectively, the "Services"). This AUP is incorporated into and supplements our Terms and Conditions. By using the Services, you agree to comply with this policy.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">2. Prohibited Activities</h2>
              <p className="mb-2">You may not use the Services to engage in any of the following:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Cheating & Exploits:</strong> Using hacks, aimbots, wallhacks, speed hacks, macros, automation software (bots), or any unauthorized third-party tools designed to gain an unfair advantage in games or tournaments.</li>
                <li><strong>Match Fixing:</strong> Deliberately losing, colluding with opponents, or manipulating tournament outcomes for personal gain.</li>
                <li><strong>Harassment & Abuse:</strong> Engaging in bullying, threats, stalking, doxing, hate speech, discrimination, or any behavior intended to intimidate or cause distress to other users, moderators, or staff.</li>
                <li><strong>Spam & Solicitation:</strong> Posting repetitive, irrelevant, or unsolicited content including advertisements, promotional materials, or phishing attempts.</li>
                <li><strong>Impersonation:</strong> Pretending to be another user, moderator, FGN staff member, or any other person or entity.</li>
                <li><strong>Illegal Activity:</strong> Using the Services for any purpose that violates local, state, national, or international law.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">3. Account Integrity</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account Sharing:</strong> Your account is personal and non-transferable. You may not share your login credentials with any other person or allow others to access the Services through your account.</li>
                <li><strong>Multi-Accounting:</strong> Creating multiple accounts to circumvent bans, gain additional tournament entries, manipulate leaderboards, or abuse the points system is strictly prohibited.</li>
                <li><strong>Account Trading:</strong> Selling, buying, or trading FGN accounts is not permitted.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">4. Content Standards</h2>
              <p className="mb-2">When posting content in community forums, chat, or any other area of the Services, you agree that your content will not:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Contain sexually explicit, pornographic, or excessively violent material.</li>
                <li>Promote racism, bigotry, hatred, or physical harm against any group or individual.</li>
                <li>Infringe on the intellectual property rights of others.</li>
                <li>Contain personal or confidential information about another person without their consent.</li>
                <li>Contain malware, viruses, or any other harmful code or links.</li>
                <li>Violate the privacy or publicity rights of any third party.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">5. Consequences of Violations</h2>
              <p className="mb-2">Violations of this AUP may result in one or more of the following actions, at FGN's sole discretion:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Warning:</strong> A formal notice that your behavior violates this policy.</li>
                <li><strong>Temporary Suspension:</strong> Your account may be suspended for a defined period, during which you will be unable to access the Services.</li>
                <li><strong>Permanent Ban:</strong> Your account may be permanently terminated, and you will be prohibited from creating new accounts.</li>
                <li><strong>Forfeiture:</strong> Any points, prizes, rankings, or rewards associated with the violation may be revoked.</li>
                <li><strong>Legal Action:</strong> In severe cases, we may pursue legal action or report your conduct to law enforcement authorities.</li>
              </ul>
              <p className="mt-2">
                The severity of the consequence will depend on the nature and frequency of the violation. FGN reserves the right to take immediate action without prior warning in cases of severe misconduct.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">6. Reporting Violations</h2>
              <p>
                If you witness or experience a violation of this AUP, we encourage you to report it immediately. You can report violations through the following channels:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Email: <a href="mailto:abuse@fibergamingnetwork.com" className="text-primary hover:underline">abuse@fibergamingnetwork.com</a></li>
                <li>In-platform reporting tools (where available)</li>
                <li>Contacting a moderator through our community Discord</li>
              </ul>
              <p className="mt-2">
                All reports are reviewed by our moderation team. We take every report seriously and will investigate promptly. Retaliation against anyone who reports a violation in good faith is strictly prohibited.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">7. Modifications to This Policy</h2>
              <p>
                FGN reserves the right to update or modify this Acceptable Use Policy at any time. If we make material changes, we will notify you by updating the date at the top of this policy or through a prominent notice on the Site. Your continued use of the Services after such changes constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">8. Contact Us</h2>
              <p>
                If you have any questions about this Acceptable Use Policy, please contact us at:{" "}
                <a href="mailto:support@fibergamingnetwork.com" className="text-primary hover:underline">
                  support@fibergamingnetwork.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptableUsePolicy;
