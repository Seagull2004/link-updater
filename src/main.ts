import {App, debounce, Editor, HeadingCache, MarkdownView, Modal, Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, LinkUpdaterSettings, SampleSettingTab} from "./settings";


export default class LinkUpdaterPlugin extends Plugin {
	settings: LinkUpdaterSettings;

	async onload() {
		await this.loadSettings();
		
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
		
		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Link Updater Status: 🟢');

		// 🗑️ trash: This creates an icon in the left ribbon.
		this.addRibbonIcon('cat', 'Sample', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});



		// This allow the plugin to save in memory the headings status of a file
		// the heading stats will be dropped after a while if the file is not used
		const headingsCache: { [path: string]: HeadingCache[] } = {};
		const deleteHeadingCache = debounce((path: string) => {
			delete headingsCache[path]
			console.log(headingsCache)
		}, 60000, true);

		this.registerEvent(this.app.workspace.on('file-open', (file) => {
			if (!file) return;
			const headings = this.app.metadataCache.getCache(file.path)?.headings
			if (headings)
				headingsCache[file.path] = headings
			console.log("added file to heading cache: ")
			console.log(headingsCache)
			// efficiently delete cache if file is not used
			deleteHeadingCache(file.path)
		}))


		// This allow the plugin to detect modification to the headings
		this.registerEvent(this.app.vault.on('modify', (param) => {
			// console.log("you have just modified something on " + param.path)
			// console.log(this.app.metadataCache.getCache(param.path)?.headings)
			// if (true)
				// console.log("you have modified a title")
			// console.log(param)
			// console.log(this.app.metadataCache)
			deleteHeadingCache(param.path)
		}))


		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			if (this.settings.enableNotification)
				new Notice(this.settings.debounce + "");
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<LinkUpdaterSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
