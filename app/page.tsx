import Link from "next/link";

export default function Home() {
  return (
    <>
      <div className="strip" aria-hidden="true">
        <span style={{ background: "var(--green)" }} />
        <span style={{ background: "var(--red)" }} />
        <span style={{ background: "var(--orange)" }} />
        <span style={{ background: "var(--blue)" }} />
      </div>

      <main className="landing">
        <header className="landing-nav">
          <Link className="landing-brand" href="/" aria-label="T-Quest home">
            <span className="tbadge">T</span>
            <span className="display">T-Quest</span>
          </Link>
          <nav className="landing-actions" aria-label="Account">
            <Link className="landing-login" href="/login">Log in</Link>
            <Link className="landing-signup" href="/signup">Sign up</Link>
          </nav>
        </header>

        <section className="landing-hero">
          <div className="landing-copy">
            <div className="landing-eyebrow">
              <span className="eyebrow-dot" />
              BOSTON NIGHTS, BETTER PLANNED
            </div>
            <h1 className="display">
              Your next night out is a <span>whole quest.</span>
            </h1>
            <p className="landing-description">
              Pick a vibe, set your budget, and bring your crew. We&apos;ll map out a night worth
              leaving the group chat for—right along the T.
            </p>
            <div className="landing-cta">
              <Link className="landing-signup landing-primary" href="/signup">
                Sign up <span aria-hidden="true">→</span>
              </Link>
              <Link className="landing-login landing-secondary" href="/login">
                Log in
              </Link>
            </div>
            <p className="landing-footnote">No planning spiral. Just pick a stop and go.</p>
          </div>

          <div className="landing-art" aria-label="A preview of a T-Quest itinerary">
            <div className="art-header">
              <div>
                <span className="art-kicker">YOUR NIGHT, SORTED</span>
                <h2 className="display">The good kind of detour</h2>
              </div>
              <span className="art-spark" aria-hidden="true">✳</span>
            </div>
            <div className="art-route">
              <div className="art-stop">
                <span className="art-number art-red">01</span>
                <div>
                  <span className="art-label">START WITH</span>
                  <strong>Your crew&apos;s kind of night</strong>
                  <p>Chill eats, big night, or somewhere in between.</p>
                </div>
              </div>
              <div className="art-stop">
                <span className="art-number art-orange">02</span>
                <div>
                  <span className="art-label">MAKE IT YOURS</span>
                  <strong>Budget-friendly stops</strong>
                  <p>A plan shaped around your time and your people.</p>
                </div>
              </div>
              <div className="art-stop">
                <span className="art-number art-green">03</span>
                <div>
                  <span className="art-label">TAKE THE T</span>
                  <strong>One route. Less guesswork.</strong>
                  <p>Get moving and make the night your own.</p>
                </div>
              </div>
            </div>
            <div className="art-footer">
              <span className="art-line" aria-hidden="true">
                <i /><i /><i /><i />
              </span>
              <span>Boston is better when you get out there.</span>
            </div>
          </div>
        </section>

        <section className="landing-benefits" aria-label="What T-Quest helps with">
          <div className="benefit">
            <span className="benefit-icon">✳</span>
            <div><strong>Made for your mood</strong><span>Pick the kind of night you want.</span></div>
          </div>
          <div className="benefit">
            <span className="benefit-icon">＄</span>
            <div><strong>Keep it in budget</strong><span>Plan around what you want to spend.</span></div>
          </div>
          <div className="benefit">
            <span className="benefit-icon">🚇</span>
            <div><strong>Get there by the T</strong><span>Spend less time figuring it out.</span></div>
          </div>
        </section>

        <footer className="landing-footer">
          <span>Made for Boston nights.</span>
          <Link href="/quest">Start planning <span aria-hidden="true">→</span></Link>
        </footer>
      </main>
    </>
  );
}
