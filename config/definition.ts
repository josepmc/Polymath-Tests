import { Config as ProtractorConfig } from "protractor";
import { Config as EmailSettings } from "imap";

export interface RunnerConfig extends ProtractorConfig {
    emailConfig?: EmailSettings;
}