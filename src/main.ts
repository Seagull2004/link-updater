import {App, HeadingCache, Modal, Notice, Plugin, TFile} from 'obsidian';
import {DEFAULT_SETTINGS, LinkUpdaterSettings, SampleSettingTab} from "./settings";


export default class LinkUpdaterPlugin extends Plugin {
	settings: LinkUpdaterSettings;

	async handleHeadingChanges (file: TFile, added: HeadingCache[], removed: HeadingCache[]) {
		console.log("Changed file:", file.path);
		console.log("Added headings:", added.map(h => h.heading));
		console.log("Removed headings:", removed.map(h => h.heading));

		let backlinks = new Set()
		// backlinks.add(file.path) // non possiamo escludere che il file stesso abbia dei link a se stesso

		const resolvedLinks = this.app.metadataCache.resolvedLinks;
		for (const fileWithLinks in resolvedLinks) {
			for (const pointedFile in resolvedLinks[fileWithLinks]) {
				if (pointedFile == file.path) {
					backlinks.add(fileWithLinks)
				}
			}
		}
		console.log(backlinks)
		if (added.length != removed.length) {
			console.log("numer of added title does not match with the removed ones")
			return
		}


		for (let i = 0; i < added.length; i++) {
			let oldTitle = "\\[\\[#" + removed[i]?.heading + "(.*)\\]\\]"
			let newTitle = "[[#" + added[i]?.heading + "$1]]"
			console.log(file.path + ":" + oldTitle + " --> " + newTitle)
			await this.replaceFileContent(file, oldTitle, newTitle)

			oldTitle = "\\[\\[(.*)" + file.basename + "#" + removed[i]?.heading + "(.*)\\]\\]"
			newTitle = "[[$1" + file.basename + "#" + added[i]?.heading + "$2]]"
			console.log(file.path + ":" + oldTitle + " --> " + newTitle)
			await this.replaceFileContent(file, oldTitle, newTitle)

			// backlinks.forEach(async (pathOfFileWithBackLinks: string) => {
			// 	const oldTitle = "\\[\\[(.*)" + file.basename + "#" + removed[i]?.heading + "(.*)\\]\\]"
			// 	const newTitle = "[[$1" + file.basename + "#" + added[i]?.heading + "$2]]"
			// 	console.log(pathOfFileWithBackLinks + ":" + oldTitle + " --> " + newTitle)
			// 	await this.replaceFileContent(file, oldTitle, newTitle)
			// })
		}
		// new Notice("Updated " + (1 + backlinks.size) + " file")
	}

	async replaceFileContent(file: TFile, search: string, replace: string) {
		if (!file) return;

		const content = await this.app.vault.read(file);
		const re = new RegExp(search, 'gi')

		const updated = content.replace(re, replace);
	
		console.log(content)
		console.log(re + " --> " + replace)
		console.log(updated)

		await this.app.vault.modify(file, updated);
	}

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
		// const headingsCache: { [path: string]: HeadingCache[] } = {};
		const headingsCache: Record<string, HeadingCache[]> = {};
		// const deleteHeadingCache = debounce((path: string) => {
		// 	delete headingsCache[path]
		// 	console.log(headingsCache)
		// }, 60000, true);
		// }, 3000, true);
		//

		const trovaDifferenzaTraHeaders = (obj1: HeadingCache[], obj2: HeadingCache[]) => {
			let oldObj = JSON.parse(JSON.stringify(obj1)) as typeof obj1
			let newObj = JSON.parse(JSON.stringify(obj1)) as typeof obj2
			let oldTitles = oldObj.filter(item => newObj.indexOf(item) < 0);
			let newTitles = newObj.filter(item => oldObj.indexOf(item) < 0);
			console.log("old titles")
			console.log(oldTitles)
			console.log("new titles")
			console.log(newTitles)

			// type 0: titolo modificato
			// type 1: titolo aggiunto
			// let differenze: {type: number, newTitle: string}[]
			// for (let i = 0; i <= oldObj.length; i++) {
			// 	const title = oldObj[i]?.heading
			// }
		}
	
		const addFileToCache = (file: TFile) => {
			// let's see if we already have this entry in our cache
			const shouldIAddThisFileToCache: boolean = (headingsCache[file.path] ? false : true)
			if (!shouldIAddThisFileToCache) {
				// we already have it, we don't have to do anything
				return;
			}
			// let's grab the headings of the file ([] if the file doesn't have any)
			const fileHeadings = this.app.metadataCache.getCache(file.path)?.headings || []
			// now we can add them to the cache
			headingsCache[file.path] = fileHeadings
		}

		const confrontaOggettiHeading = (obj1: HeadingCache[], obj2: HeadingCache[]) => {
			if (obj1.length != obj2.length) {
				return false
			}

			for (let i = 0; i < obj1.length; i++) {
				if (obj1[i]?.heading != obj2[i]?.heading) {
					return false
				}
			}
			return true
		}



		// l'apertura di un file deve comportare il caricamento dei suoi heading nella cache
		this.registerEvent(this.app.workspace.on('file-open', (file) => {
			if (!file) return;
			addFileToCache(file)
			console.log("Aggiunta nuova entry nella cache: " + file.path)
			console.log(headingsCache)
			// TODO: efficiently delete cache if file is not used
			// deleteHeadingCache(file.path)
		}))

		// La modifica del metadataCache può essere un buon indizio di modifica degli heading di un file
		// meglio dare un occhiata
		this.registerEvent(this.app.metadataCache.on('changed', (file: TFile) => {
			if (!file || !file.path.endsWith('.md')) return;
			console.log("congrautualazioni, hai appena rilevatao una modifica della metadataCache 🥳")
			console.log(file)

			// è giunto il momento di dare un'occhiata ai titoli, sia quelli più recenti sia quelli presenti nella cache
			const newCache = this.app.metadataCache.getFileCache(file);
			const newHeadings = newCache?.headings || [];
			const oldHeadings = headingsCache[file.path] || [];
			// utilizziamo un approccio insiemistico
			const oldSet = new Set(oldHeadings.map(h => h.heading));
			const newSet = new Set(newHeadings.map(h => h.heading));

			const added = newHeadings.filter(h => !oldSet.has(h.heading));
			const removed = oldHeadings.filter(h => !newSet.has(h.heading));

			if (added.length == 0 && removed.length == 0) {
				// nessuna modifica, la modifica di metadaCache non ci ha interessato sto giro
				return
			}

			

			// abbiamo raccolto tutte le informazioni di avevamo abbiamo bisogno
			// possiamo aggiornare la cache con i nuovi titoli per questo file
			headingsCache[file.path] = newHeadings;

			// handle link updates
			this.handleHeadingChanges(file, added, removed);
		}));


		// this.registerEvent(this.app.metadataCache.on('changed', (whatIsThis) => {
		// 	// check what file is changed
		//
		// 	// check what heading of that file are changed with the headingsCache variable
		// 	// const headingsCache: { [path: string]: HeadingCache[] } = {};
		//
		// 	// print the heading that are changed / removed / added
		//
		// 	// list the files that points to the old heading
		//
		// 	// extra: modify all the files (same file included) that point to the old heading with the new heading 
		// }))

		// this.registerEvent(this.app.vault.on('modify', (file) => {
		// 	if (!file) return;
		// 	const oldHeadings = headingsCache[file.path]
		// 	if (oldHeadings === undefined) return;
		// 	setTimeout(() => {
		// 		const currentHeadings = this.app.metadataCache.getCache(file.path)?.headings
		// 		// console.log("you have just modified something on " + param.path)
		// 		// console.log(this.app.metadataCache.getCache(param.path)?.headings)
		// 		// if (true)
		// 			// console.log("you have modified a title")
		// 		// console.log(param)
		// 		// console.log(this.app.metadataCache)
		// 		let titoloModificato: boolean
		//
		// 		console.log("hai modificato qualcosa... adesso controllo")
		// 		console.log("questi sono i vecchi titoli:")
		// 		console.log(oldHeadings)
		// 		console.log("questi sono i nuovi titoli:")
		// 		console.log(currentHeadings)
		// 		if (currentHeadings) {
		// 			titoloModificato = !confrontaOggettiHeading(currentHeadings, oldHeadings)
		// 		} else {
		// 			titoloModificato = headingsCache[file.path]?.length != 0
		// 		}
		//
		// 		if (titoloModificato) {
		// 			console.log("ho notato che hai modificato un titolo...")
		// 			if (currentHeadings) {
		// 				headingsCache[file.path] = currentHeadings
		// 				console.log( "aggiornato" + " file to heading cache: " + file.path)
		// 				trovaDifferenzaTraHeaders(currentHeadings, oldHeadings)
		// 			} else { 
		// 				headingsCache[file.path] = []
		// 				console.log( "aggiornato" + " file to heading cache: " + file.path)
		// 			}
		// 		}
		// 		console.log(headingsCache)
		// 		// efficiently delete cache if file is not used
		// 		// deleteHeadingCache(file.path)
		// 		console.log("...fine del controllo")
		// 	}, this.settings.debounce) // TODO: a quanto pare obsidian ridarta di un po' ad aggiornare metadataCache, per ora risolvo con una leggera attessa scelta dall'utente
		// }))


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
