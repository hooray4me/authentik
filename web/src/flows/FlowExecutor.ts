import { gettext } from "django";
import { LitElement, html, customElement, property, TemplateResult, CSSResult, css } from "lit-element";

import PFLogin from "@patternfly/patternfly/components/Login/login.css";
import PFBackgroundImage from "@patternfly/patternfly/components/BackgroundImage/background-image.css";
import PFList from "@patternfly/patternfly/components/List/list.css";
import AKGlobal from "../authentik.css";
import PFBase from "@patternfly/patternfly/patternfly-base.css";
import PFTitle from "@patternfly/patternfly/components/Title/title.css";

import { unsafeHTML } from "lit-html/directives/unsafe-html";
import "./stages/authenticator_static/AuthenticatorStaticStage";
import "./stages/authenticator_totp/AuthenticatorTOTPStage";
import "./stages/authenticator_validate/AuthenticatorValidateStage";
import "./stages/authenticator_webauthn/WebAuthnAuthenticatorRegisterStage";
import "./stages/autosubmit/AutosubmitStage";
import "./stages/captcha/CaptchaStage";
import "./stages/consent/ConsentStage";
import "./stages/email/EmailStage";
import "./stages/identification/IdentificationStage";
import "./stages/password/PasswordStage";
import "./stages/prompt/PromptStage";
import { ShellChallenge, RedirectChallenge } from "../api/Flows";
import { IdentificationChallenge } from "./stages/identification/IdentificationStage";
import { PasswordChallenge } from "./stages/password/PasswordStage";
import { ConsentChallenge } from "./stages/consent/ConsentStage";
import { EmailChallenge } from "./stages/email/EmailStage";
import { AutosubmitChallenge } from "./stages/autosubmit/AutosubmitStage";
import { PromptChallenge } from "./stages/prompt/PromptStage";
import { AuthenticatorTOTPChallenge } from "./stages/authenticator_totp/AuthenticatorTOTPStage";
import { AuthenticatorStaticChallenge } from "./stages/authenticator_static/AuthenticatorStaticStage";
import { AuthenticatorValidateStageChallenge } from "./stages/authenticator_validate/AuthenticatorValidateStage";
import { WebAuthnAuthenticatorRegisterChallenge } from "./stages/authenticator_webauthn/WebAuthnAuthenticatorRegisterStage";
import { CaptchaChallenge } from "./stages/captcha/CaptchaStage";
import { SpinnerSize } from "../elements/Spinner";
import { StageHost } from "./stages/base";
import { Challenge, ChallengeTypeEnum, FlowsApi } from "authentik-api";
import { DEFAULT_CONFIG } from "../api/Config";

@customElement("ak-flow-executor")
export class FlowExecutor extends LitElement implements StageHost {
    @property()
    flowSlug = "";

    @property({attribute: false})
    challenge?: Challenge;

    @property({type: Boolean})
    loading = false;

    static get styles(): CSSResult[] {
        return [PFBase, PFLogin, PFTitle].concat(css`
            .ak-loading {
                display: flex;
                height: 100%;
                width: 100%;
                justify-content: center;
                align-items: center;
                position: absolute;
                background-color: #0303039e;
            }
            .ak-hidden {
                display: none;
            }
            :host {
                position: relative;
            }
            .ak-exception {
                font-family: monospace;
                overflow-x: scroll;
            }
        `);
    }

    constructor() {
        super();
        this.addEventListener("ak-flow-submit", () => {
            this.submit();
        });
        document.adoptedStyleSheets = [PFLogin, PFBackgroundImage, PFList, AKGlobal];
    }

    submit<T>(formData?: T): Promise<void> {
        this.loading = true;
        return new FlowsApi(DEFAULT_CONFIG).flowsExecutorSolveRaw({
            flowSlug: this.flowSlug,
            data: formData || {},
        }).then((challengeRaw) => {
            return challengeRaw.raw.json();
        }).then((data) => {
            this.challenge = data;
        }).catch((e) => {
            this.errorMessage(e);
        }).finally(() => {
            this.loading = false;
        });
    }

    firstUpdated(): void {
        this.loading = true;
        new FlowsApi(DEFAULT_CONFIG).flowsExecutorGetRaw({
            flowSlug: this.flowSlug
        }).then((challengeRaw) => {
            return challengeRaw.raw.json();
        }).then((challenge) => {
            this.challenge = challenge as Challenge;
        }).catch((e) => {
            // Catch JSON or Update errors
            this.errorMessage(e);
        }).finally(() => {
            this.loading = false;
        });
    }

    errorMessage(error: string): void {
        this.challenge = <ShellChallenge>{
            type: ChallengeTypeEnum.Shell,
            body: `<header class="pf-c-login__main-header">
                <h1 class="pf-c-title pf-m-3xl">
                    ${gettext("Whoops!")}
                </h1>
            </header>
            <div class="pf-c-login__main-body">
                <h3>${gettext("Something went wrong! Please try again later.")}</h3>
                <pre class="ak-exception">${error}</pre>
            </div>`
        };
    }

    renderLoading(): TemplateResult {
        return html`<div class="ak-loading">
            <ak-spinner size=${SpinnerSize.XLarge}></ak-spinner>
        </div>`;
    }

    renderChallenge(): TemplateResult {
        if (!this.challenge) {
            return this.renderLoading();
        }
        switch (this.challenge.type) {
            case ChallengeTypeEnum.Redirect:
                console.debug(`authentik/flows: redirecting to ${(this.challenge as RedirectChallenge).to}`);
                window.location.assign((this.challenge as RedirectChallenge).to);
                return this.renderLoading();
            case ChallengeTypeEnum.Shell:
                return html`${unsafeHTML((this.challenge as ShellChallenge).body)}`;
            case ChallengeTypeEnum.Native:
                switch (this.challenge.component) {
                    case "ak-stage-identification":
                        return html`<ak-stage-identification .host=${this} .challenge=${this.challenge as IdentificationChallenge}></ak-stage-identification>`;
                    case "ak-stage-password":
                        return html`<ak-stage-password .host=${this} .challenge=${this.challenge as PasswordChallenge}></ak-stage-password>`;
                    case "ak-stage-captcha":
                        return html`<ak-stage-captcha .host=${this} .challenge=${this.challenge as CaptchaChallenge}></ak-stage-captcha>`;
                    case "ak-stage-consent":
                        return html`<ak-stage-consent .host=${this} .challenge=${this.challenge as ConsentChallenge}></ak-stage-consent>`;
                    case "ak-stage-email":
                        return html`<ak-stage-email .host=${this} .challenge=${this.challenge as EmailChallenge}></ak-stage-email>`;
                    case "ak-stage-autosubmit":
                        return html`<ak-stage-autosubmit .host=${this} .challenge=${this.challenge as AutosubmitChallenge}></ak-stage-autosubmit>`;
                    case "ak-stage-prompt":
                        return html`<ak-stage-prompt .host=${this} .challenge=${this.challenge as PromptChallenge}></ak-stage-prompt>`;
                    case "ak-stage-authenticator-totp":
                        return html`<ak-stage-authenticator-totp .host=${this} .challenge=${this.challenge as AuthenticatorTOTPChallenge}></ak-stage-authenticator-totp>`;
                    case "ak-stage-authenticator-static":
                        return html`<ak-stage-authenticator-static .host=${this} .challenge=${this.challenge as AuthenticatorStaticChallenge}></ak-stage-authenticator-static>`;
                    case "ak-stage-authenticator-webauthn":
                        return html`<ak-stage-authenticator-webauthn .host=${this} .challenge=${this.challenge as WebAuthnAuthenticatorRegisterChallenge}></ak-stage-authenticator-webauthn>`;
                    case "ak-stage-authenticator-validate":
                        return html`<ak-stage-authenticator-validate .host=${this} .challenge=${this.challenge as AuthenticatorValidateStageChallenge}></ak-stage-authenticator-validate>`;
                    default:
                        break;
                }
                break;
            default:
                console.debug(`authentik/flows: unexpected data type ${this.challenge.type}`);
                break;
        }
        return html``;
    }

    render(): TemplateResult {
        if (!this.challenge) {
            return this.renderLoading();
        }
        return html`
            ${this.loading ? this.renderLoading() : html``}
            ${this.renderChallenge()}
        `;
    }
}
