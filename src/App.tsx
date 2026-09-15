import { useEffect, useMemo, useState } from 'react'
import Button from '@jetbrains/ring-ui-built/components/button/button'
import Panel from '@jetbrains/ring-ui-built/components/panel/panel'
import { downloadResumePdf } from './pdf'
import { type ImageAsset, resumeData, resumeSections, type ResumeSectionId } from './resume-data'

const THEME_STORAGE_KEY = 'resume-react-theme'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function formatBangkokDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(date)
}

function getBangkokHour(date: Date) {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok',
    }).format(date),
  )
}

function LogoButton({ asset, alt, onClick }: { asset: ImageAsset; alt: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-20 items-center justify-center rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-lg ${asset.surface === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-[color:var(--app-border)] bg-white/90'}`}
    >
      <img src={asset.src} alt={alt} className="max-h-16 w-auto object-contain" loading="lazy" />
    </button>
  )
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [activeSection, setActiveSection] = useState<ResumeSectionId>('about')
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const ratios = new Map<ResumeSectionId, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id as ResumeSectionId, entry.isIntersecting ? entry.intersectionRatio : 0)
        }

        const nextSection = resumeSections.reduce(
          (best, section) => {
            const ratio = ratios.get(section.id) ?? 0
            return ratio > best.ratio ? { id: section.id, ratio } : best
          },
          { id: 'about' as ResumeSectionId, ratio: 0 },
        )

        if (nextSection.ratio > 0) {
          setActiveSection(nextSection.id)
        }
      },
      {
        threshold: [0.2, 0.35, 0.5, 0.7],
        rootMargin: '-20% 0px -55% 0px',
      },
    )

    const sectionElements = resumeSections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element))

    sectionElements.forEach((element) => observer.observe(element))

    return () => {
      observer.disconnect()
    }
  }, [])

  const bangkokTime = useMemo(() => formatBangkokDate(currentTime), [currentTime])
  const isAvailable = useMemo(() => {
    const hour = getBangkokHour(currentTime)
    return hour >= 9 && hour < 18
  }, [currentTime])

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <header className="sticky top-0 z-20 border-b border-[color:var(--app-border)] bg-[color:var(--app-surface)]/90 backdrop-blur no-print">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--app-muted)]">React version</p>
              <h1 className="text-2xl font-semibold text-[var(--app-heading)]">{resumeData.name}</h1>
              <p className="text-sm text-[var(--app-muted)]">{resumeData.title}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button primary onClick={() => downloadResumePdf(resumeData)}>
                Download PDF
              </Button>
              <Button onClick={() => window.print()}>Print</Button>
              <Button
                ghost
                onClick={() => setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))}
              >
                {theme === 'light' ? 'Dark mode' : 'Light mode'}
              </Button>
            </div>
          </div>

          <nav aria-label="Section navigation" className="overflow-x-auto">
            <ul className="flex min-w-max items-center gap-2">
              {resumeSections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={`inline-flex rounded-full border px-4 py-2 text-sm font-medium transition ${activeSection === section.id ? 'border-[color:var(--app-accent)] bg-[color:var(--app-accent-soft)] text-[var(--app-heading)]' : 'border-[color:var(--app-border)] bg-transparent text-[var(--app-muted)] hover:border-[color:var(--app-accent)] hover:text-[var(--app-heading)]'}`}
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section id="about" className="scroll-mt-36">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
            <Panel className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <span className={`h-2.5 w-2.5 rounded-full ${isAvailable ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.55)]' : 'bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.45)]'}`}></span>
                  {isAvailable ? 'Available in Bangkok business hours' : 'Outside Bangkok business hours'}
                </span>
                <span className="rounded-full border border-[color:var(--app-border)] px-3 py-1 text-sm text-[var(--app-muted)]">
                  {bangkokTime}
                </span>
              </div>

              <div className="space-y-5">
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--app-accent)]">Résumé portfolio</p>
                <div className="space-y-3">
                  <h2 className="max-w-3xl text-4xl font-semibold leading-tight text-[var(--app-heading)] sm:text-5xl">
                    Backend engineer with a full-stack delivery mindset.
                  </h2>
                  <p className="max-w-3xl text-lg leading-8 text-[var(--app-muted)]">
                    Building reliable APIs, integrations, reporting features, and developer workflows for banking, fintech, food-tech, and tax platforms.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button primary href={`mailto:${resumeData.details.email}`}>
                    Email me
                  </Button>
                  <Button href={resumeData.links[0].url} target="_blank" rel="noreferrer">
                    View GitHub
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] p-6 shadow-sm">
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--app-muted)]">Highlights</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--app-heading)]">Core strengths</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-accent-soft)] px-3 py-1 text-sm font-medium text-[var(--app-heading)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4">
                    <dt className="text-sm text-[var(--app-muted)]">Location</dt>
                    <dd className="mt-1 font-medium text-[var(--app-heading)]">{resumeData.details.location}</dd>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4">
                    <dt className="text-sm text-[var(--app-muted)]">Contact</dt>
                    <dd className="mt-1 font-medium text-[var(--app-heading)]">{resumeData.details.email}</dd>
                  </div>
                </dl>
              </div>
            </Panel>
          </div>
        </section>

        <section id="summary" className="scroll-mt-36">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">Professional summary</p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--app-heading)]">What I deliver</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {resumeData.summary.map((item, index) => (
              <Panel
                key={item}
                className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--app-accent-soft)] text-lg font-semibold text-[var(--app-heading)]">
                    {index + 1}
                  </span>
                  <p className="text-base leading-7 text-[var(--app-muted)]">{item}</p>
                </div>
              </Panel>
            ))}
          </div>
        </section>

        <section id="experience" className="scroll-mt-36">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">Employment</p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--app-heading)]">Experience timeline</h2>
          </div>

          <div className="space-y-5">
            {resumeData.experience.map((item) => (
              <Panel
                key={`${item.company}-${item.period}`}
                className="print-break-inside-avoid rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm"
              >
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_15rem]">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[color:var(--app-accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--app-heading)]">
                          {item.period}
                        </span>
                        {item.employmentTypes.map((employmentType) => (
                          <span
                            key={employmentType}
                            className="rounded-full border border-[color:var(--app-border)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--app-muted)]"
                          >
                            {employmentType}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-2xl font-semibold text-[var(--app-heading)]">{item.role}</h3>
                      <p className="text-lg font-medium text-[var(--app-heading)]">{item.company}</p>
                      <p className="text-sm text-[var(--app-muted)]">{item.location}</p>
                      {item.client && (
                        <p className="text-sm text-[var(--app-muted)]">Client: {item.client.name}</p>
                      )}
                    </div>

                    <ul className="space-y-3 text-sm leading-7 text-[var(--app-muted)]">
                      {item.highlights.map((highlight) => (
                        <li key={highlight} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--app-accent)]"></span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap gap-2">
                      {item.technologies.map((technology) => (
                        <span
                          key={technology}
                          className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-1 text-xs font-medium text-[var(--app-heading)]"
                        >
                          {technology}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <LogoButton
                      asset={item.companyLogo}
                      alt={`${item.company} logo`}
                      onClick={() => setZoomImage({ src: item.companyLogo.src, alt: `${item.company} logo` })}
                    />
                    {item.client && (
                      <LogoButton
                        asset={item.client.logo}
                        alt={`${item.client.name} logo`}
                        onClick={() => setZoomImage({ src: item.client.logo.src, alt: `${item.client.name} logo` })}
                      />
                    )}
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
          <section id="education" className="scroll-mt-36">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">Academic background</p>
              <h2 className="mt-2 text-3xl font-semibold text-[var(--app-heading)]">Education</h2>
            </div>

            <Panel className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-[var(--app-heading)]">{resumeData.education.degree}</h3>
                    <p className="mt-2 text-lg font-medium text-[var(--app-heading)]">{resumeData.education.institution}</p>
                    <p className="text-sm text-[var(--app-muted)]">{resumeData.education.period}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] p-4">
                      <p className="text-sm text-[var(--app-muted)]">GPAX</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--app-heading)]">{resumeData.education.gpax}</p>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] p-4">
                      <p className="text-sm text-[var(--app-muted)]">Senior project</p>
                      <a
                        href={resumeData.education.seniorProject.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-xl font-semibold text-[var(--app-accent)] hover:underline"
                      >
                        {resumeData.education.seniorProject.name}
                      </a>
                    </div>
                  </div>
                </div>

                <LogoButton
                  asset={resumeData.education.institutionLogo}
                  alt={`${resumeData.education.institution} logo`}
                  onClick={() =>
                    setZoomImage({
                      src: resumeData.education.institutionLogo.src,
                      alt: `${resumeData.education.institution} logo`,
                    })
                  }
                />
              </div>
            </Panel>
          </section>

          <div className="space-y-6">
            <section id="skills" className="scroll-mt-36">
              <div className="mb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">Technical toolkit</p>
                <h2 className="mt-2 text-3xl font-semibold text-[var(--app-heading)]">Skills</h2>
              </div>

              <Panel className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
                <div className="flex flex-wrap gap-3">
                  {resumeData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] px-4 py-2 text-sm font-medium text-[var(--app-heading)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </Panel>
            </section>

            <section id="profile" className="scroll-mt-36">
              <div className="mb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">Public details</p>
                <h2 className="mt-2 text-3xl font-semibold text-[var(--app-heading)]">Profile</h2>
              </div>

              <Panel className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
                <div className="space-y-6">
                  <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <div>
                      <dt className="text-sm text-[var(--app-muted)]">Email</dt>
                      <dd className="mt-1 text-base font-medium text-[var(--app-heading)]">{resumeData.details.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-[var(--app-muted)]">Phone</dt>
                      <dd className="mt-1 text-base font-medium text-[var(--app-heading)]">{resumeData.details.phoneLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-[var(--app-muted)]">Nationality</dt>
                      <dd className="mt-1 text-base font-medium text-[var(--app-heading)]">{resumeData.details.nationality}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-[var(--app-muted)]">Birth date</dt>
                      <dd className="mt-1 text-base font-medium text-[var(--app-heading)]">{resumeData.details.birthDate}</dd>
                    </div>
                  </dl>

                  <div className="space-y-3">
                    {resumeData.links.map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div>
                          <p className="text-sm text-[var(--app-muted)]">External link</p>
                          <p className="text-base font-semibold text-[var(--app-heading)]">{link.label}</p>
                        </div>
                        {link.logo ? (
                          <button
                            type="button"
                            className="inline-flex rounded-xl border border-[color:var(--app-border)] bg-white/90 p-3"
                            onClick={(event) => {
                              event.preventDefault()
                              setZoomImage({ src: link.logo!.src, alt: `${link.label} logo` })
                            }}
                          >
                            <img src={link.logo.src} alt={`${link.label} logo`} className="h-8 w-auto object-contain" />
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-[var(--app-accent)]">Open ↗</span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              </Panel>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-[color:var(--app-border)] bg-[var(--app-surface)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-[var(--app-muted)] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>
            {resumeData.name} · {resumeData.title}
          </p>
          <p>{resumeData.details.location}</p>
        </div>
      </footer>

      {zoomImage && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-label={zoomImage.alt}
          onClick={() => setZoomImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomImage(null)}
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white"
          >
            Close
          </button>
          <img
            src={zoomImage.src}
            alt={zoomImage.alt}
            className="max-h-[85vh] max-w-full rounded-3xl bg-white p-6 shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}

export default App
