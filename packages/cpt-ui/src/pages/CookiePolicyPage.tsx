import {Link} from "react-router-dom"

const CookiePolicyPage = () => (
  <main className="nhsuk-main-wrapper nhsuk-main-wrapper--s" id="main-content" role="main">
    <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb">
      <ol className="nhsuk-breadcrumb__list">
        <li className="nhsuk-breadcrumb__item">
          <Link className="nhsuk-breadcrumb__link" to="/search">Home</Link>
        </li>
      </ol>
      <p className="nhsuk-breadcrumb__back">
        <a className="nhsuk-breadcrumb__backlink" href="#">
          <span className="nhsuk-u-visually-hidden">Back to &nbsp;</span>
          Level three
        </a>
      </p>
    </nav>

    <div className="nhsuk-grid-row">
      <div className="nhsuk-grid-column-full">
        <h1 className="nhsuk-heading-xl">Cookie policy</h1>
        <p>
          NHS England uses cookies on the Clinical Prescription Tracking Service (CPTS).
          For information about how we store your data, check our{" "}
          <a href="#">privacy policy</a> for this service.
        </p>

        <h2 className="nhsuk-heading-l">What are cookies?</h2>
        <p>
          Cookies are small files that are put on your phone, tablet, laptop or computer when you use a website or app.
        </p>
        <p>
          Some cookies make a website or app work and others store information about how you use a service,
          such as the pages you visit.
        </p>
        <p>Cookies are not viruses or computer programs. They are very small so do not take up much space.</p>

        <h2 className="nhsuk-heading-l">How we use cookies</h2>
        <p>We use cookies to make our service work and keep it secure. These are known as essential cookies.</p>
        <p>
          We also use cookies to measure how you use our service.
          These are analytics cookies and we will only use them if you say it’s ok.
        </p>

        <div className="nhsuk-form-group">
          <fieldset className="nhsuk-fieldset">
            <legend className="nhsuk-fieldset__legend nhsuk-fieldset__legend--m">
              <h3 className="nhsuk-fieldset__heading">
                Choose if we can use cookies to measure your website use
              </h3>
            </legend>

            <div className="nhsuk-radios">
              <div className="nhsuk-radios__item">
                <input className="nhsuk-radios__input" id="example-1" name="cookie-measure" type="radio" value="yes" />
                <label className="nhsuk-label nhsuk-radios__label" htmlFor="example-1">
                  Use cookies to measure my website use
                </label>
              </div>

              <div className="nhsuk-radios__item">
                <input className="nhsuk-radios__input" id="example-2" name="cookie-measure" type="radio" value="no" />
                <label className="nhsuk-label nhsuk-radios__label" htmlFor="example-2">
                  Do not use cookies to measure my website use
                </label>
              </div>
            </div>
          </fieldset>
        </div>

        <Link className="nhsuk-button" to="/cookies-selected">
          Save my cookie settings
        </Link>

        <h2 className="nhsuk-heading-l">How to change your cookie settings</h2>
        <p>You can visit this page at any time to change your cookie settings.</p>
        <p>You can also change your cookie settings in most devices and browsers.</p>
        <p>CPTS might not work properly if all cookies are turned off.</p>

        <h2 className="nhsuk-heading-l">Changes to this cookie policy</h2>
        <p>If this policy changes, you will see the cookie banner again next time you visit CPTS.</p>
      </div>
    </div>
  </main>
)

export default CookiePolicyPage
