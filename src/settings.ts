import {App, PluginSettingTab, Setting, SliderComponent, ToggleComponent} from "obsidian";
import LinkUpdaterPlugin from "./main";

export interface LinkUpdaterSettings {
	debounce: number;
	enableNotification: boolean;
}

export const DEFAULT_SETTINGS: LinkUpdaterSettings = {
	debounce: 1500,
	enableNotification: false
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: LinkUpdaterPlugin;

	constructor(app: App, plugin: LinkUpdaterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('⌛ Debounce (in ms)')
			.setDesc('Choose the update frequency over the headings change (default is: 1500)')
			.addSlider(slider => slider
				.setDynamicTooltip()
				.setLimits(500, 4000, 500)
				.setValue(this.plugin.settings.debounce)
				.onChange(async (value) => {
					this.plugin.settings.debounce = value;
					await this.plugin.saveSettings()
				})
			);
		new Setting(containerEl)
			.setName('🔔 Notification for modification')
			.setDesc('Turn it on if you want a notification that explain if a modification of a title has modified any backlink')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableNotification)
				.onChange(async (value) => {
					this.plugin.settings.enableNotification = value;
					await this.plugin.saveSettings();
					this.display(); 
				})
			);
	}
}
