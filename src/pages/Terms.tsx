import { Link } from "react-router-dom";
import { ArrowLeft, Gamepad2 } from "lucide-react";

const Terms = () => {
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
              Terms and Conditions
            </h1>
          </div>

          <p className="text-sm text-muted-foreground mb-8">Last Updated: January 7, 2026</p>

          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/90 font-body">
            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">1. Introduction and Acceptance of Terms</h2>
              <p>
                Welcome to the Fiber Gaming Network ("FGN," "we," "us," or "our"). These Terms and Conditions ("Terms") govern your access to and use of the website located at https://www.fibergamingnetwork.com (the "Site"), our gaming platform, community discord, tournaments, and related services (collectively, the "Services"). By accessing the Site, creating an account, or participating in any FGN event, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Services.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">2. Eligibility</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Age Requirement:</strong> The Services are intended for users who are at least 13 years of age. If you are under 18 (or the age of majority in your jurisdiction), you represent that your legal guardian has reviewed and agreed to these Terms on your behalf.</li>
                <li><strong>Residency:</strong> The Services are primarily directed at users located in the United States, specifically those within the service areas of our Partner Internet Service Providers ("Partner ISPs").</li>
                <li><strong>ISP Partnership:</strong> Access to certain premium features, tournaments, or "free" entry may be contingent upon maintaining an active subscription with a Partner ISP. Verification of your ISP subscription status may be required.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">3. User Accounts</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Registration:</strong> To access most features, you must register for an account. You agree to provide accurate, current, and complete information during the registration process.</li>
                <li><strong>Discord Integration:</strong> You may be required to link a Discord account to participate in events. You are responsible for complying with Discord's Terms of Service in addition to ours.</li>
                <li><strong>Security:</strong> You are responsible for safeguarding your account credentials. You agree to notify us immediately of any unauthorized use of your account. FGN is not liable for any loss that you may incur as a result of someone else using your password or account, either with or without your knowledge.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">4. Tournaments, Contests, and Prizes</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Rules:</strong> Participation in tournaments or game nights is subject to specific rules and regulations posted for each event. FGN reserves the right to disqualify any participant for cheating, unsportsmanlike conduct, or violation of specific event rules.</li>
                <li><strong>Prizes:</strong> Prizes are awarded at our sole discretion. We reserve the right to substitute a prize of equal or greater value.</li>
                <li><strong>Taxes:</strong> You are solely responsible for any federal, state, and local taxes associated with the receipt of any prize. If required by law (e.g., winning over $600 in a calendar year), you agree to provide us with applicable tax forms (such as a W-9) prior to receiving your prize.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">5. Code of Conduct</h2>
              <p className="mb-2">To maintain a fun and safe community, you agree NOT to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Use the Services for any illegal purpose or in violation of any local, state, national, or international law.</li>
                <li>Harass, threaten, demean, embarrass, or cause distress or discomfort to another participant, moderator, or FGN staff member.</li>
                <li>Use cheats, automation software (bots), hacks, mods, or any unauthorized third-party software designed to modify or interfere with the Service or any game.</li>
                <li>Post or transmit content that is infringing, libelous, defamatory, obscene, pornographic, abusive, or offensive.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">6. Intellectual Property</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>FGN Content:</strong> The Site, logos, graphics, and original content are the property of Fiber Gaming Network or its licensors and are protected by copyright and trademark laws.</li>
                <li><strong>User Content:</strong> By posting content (e.g., gameplay clips, chat messages) to the Services, you grant FGN a non-exclusive, royalty-free, perpetual, worldwide license to use, display, and distribute such content in connection with operating and marketing the Services.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">7. Disclaimer of Warranties</h2>
              <p className="uppercase text-xs leading-relaxed">
                THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMISSIBLE PURSUANT TO APPLICABLE LAW, FGN DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED OR ERROR-FREE, OR THAT DEFECTS WILL BE CORRECTED.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">8. Limitation of Liability</h2>
              <p className="uppercase text-xs leading-relaxed">
                IN NO EVENT SHALL FGN, ITS PARENT COMPANIES, SUBSIDIARIES, PARTNER ISPs, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATING TO YOUR ACCESS TO OR USE OF, OR YOUR INABILITY TO ACCESS OR USE, THE SERVICES OR ANY MATERIALS OR CONTENT ON THE SERVICES, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STATUTE, OR ANY OTHER LEGAL THEORY.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">9. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless FGN, its officers, directors, employees, agents, and Partner ISPs from and against any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or in any way connected with your access to or use of the Services or your violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">10. Dispute Resolution (Binding Arbitration)</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Arbitration:</strong> Any dispute, claim, or controversy arising out of or relating to these Terms or the breach, termination, enforcement, interpretation, or validity thereof shall be determined by binding arbitration, rather than in court.</li>
                <li><strong>Class Action Waiver:</strong> YOU AND FGN AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">11. Modifications to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. If we make material changes, we will notify you by updating the date at the top of these Terms or through a prominent notice on the Site. Your continued use of the Services after such changes constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">12. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us at:{" "}
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

export default Terms;
