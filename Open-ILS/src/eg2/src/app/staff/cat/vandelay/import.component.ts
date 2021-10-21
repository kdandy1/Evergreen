import {Component, OnInit, AfterViewInit, Input,
    ViewChild, OnDestroy} from '@angular/core';
import {Subject} from 'rxjs';
import {tap} from 'rxjs/operators';
import {IdlObject} from '@eg/core/idl.service';
import {NetService} from '@eg/core/net.service';
import {EventService} from '@eg/core/event.service';
import {OrgService} from '@eg/core/org.service';
import {AuthService} from '@eg/core/auth.service';
import {ToastService} from '@eg/share/toast/toast.service';
import {ComboboxComponent,
    ComboboxEntry} from '@eg/share/combobox/combobox.component';
import {VandelayService, VandelayImportSelection,
  VANDELAY_UPLOAD_PATH} from './vandelay.service';
import {HttpClient, HttpRequest, HttpEventType} from '@angular/common/http';
import {HttpResponse, HttpErrorResponse} from '@angular/common/http';
import {ProgressInlineComponent} from '@eg/share/dialog/progress-inline.component';
import {AlertDialogComponent} from '@eg/share/dialog/alert.component';
import {ServerStoreService} from '@eg/core/server-store.service';

const TEMPLATE_SETTING_NAME = 'eg.cat.vandelay.import.templates';

const TEMPLATE_ATTRS = [
    'recordType',
    'selectedBibSource',
    'selectedMatchSet',
    'mergeOnExact',
    'importNonMatching',
    'mergeOnBestMatch',
    'mergeOnSingleMatch',
    'autoOverlayAcqCopies',
    'autoOverlayOnOrderCopies',
    'autoOverlayOrgUnitCopies',
    'selectedHoldingsProfile',
    'selectedMergeProfile',
    'selectedFallThruMergeProfile',
    'selectedTrashGroups',
    'minQualityRatio'
];

interface ImportOptions {
    session_key: string;
    overlay_map?: {[qrId: number]: /* breId */ number};
    import_no_match?: boolean;
    auto_overlay_exact?: boolean;
    auto_overlay_best_match?: boolean;
    auto_overlay_1match?: boolean;
    opp_acq_copy_overlay?: boolean;
    opp_oo_cat_copy_overlay?: boolean;
    auto_overlay_org_unit_copies?: boolean;
    merge_profile?: any;
    fall_through_merge_profile?: any;
    strip_field_groups?: number[];
    match_quality_ratio: number;
    exit_early: boolean;
}

@Component({
  templateUrl: 'import.component.html'
})
export class ImportComponent implements OnInit, AfterViewInit, OnDestroy {

    recordType: string;
    selectedQueue: ComboboxEntry; // freetext enabled

    // used for applying a default queue ID value when we have
    // a load-time queue before the queue combobox entries exist.
    startQueueId: number;

    bibTrashGroups: IdlObject[];
    selectedTrashGroups: number[];

    activeQueueId: number;
    selectedBucket: number;
    selectedBibSource: number;
    selectedMatchSet: number;
    selectedHoldingsProfile: number;
    selectedMergeProfile: number;
    selectedFallThruMergeProfile: number;
    selectedFile: File;

    defaultMatchSet: string;

    importNonMatching: boolean;
    mergeOnExact: boolean;
    mergeOnSingleMatch: boolean;
    mergeOnBestMatch: boolean;
    minQualityRatio: number;
    autoOverlayAcqCopies: boolean;
    autoOverlayOnOrderCopies: boolean;
    autoOverlayOrgUnitCopies: boolean;

    // True after the first upload, then remains true.
    showProgress: boolean;

    // Upload in progress.
    isUploading: boolean;

    // True only after successful upload
    uploadComplete: boolean;

    // Upload / processsing session key
    // Generated by the server
    sessionKey: string;

    // Optional enqueue/import tracker session name.
    sessionName: string;

    selectedTemplate: string;
    formTemplates: {[name: string]: any};
    newTemplateName: string;

    @ViewChild('fileSelector', { static: false }) private fileSelector;
    @ViewChild('uploadProgress', { static: true })
        private uploadProgress: ProgressInlineComponent;
    @ViewChild('enqueueProgress', { static: true })
        private enqueueProgress: ProgressInlineComponent;
    @ViewChild('importProgress', { static: true })
        private importProgress: ProgressInlineComponent;

    // Need these refs so values can be applied via external stimuli
    @ViewChild('formTemplateSelector', { static: true })
        private formTemplateSelector: ComboboxComponent;
    @ViewChild('recordTypeSelector', { static: true })
        private recordTypeSelector: ComboboxComponent;
    @ViewChild('bibSourceSelector', { static: true })
        private bibSourceSelector: ComboboxComponent;
    @ViewChild('matchSetSelector', { static: true })
        private matchSetSelector: ComboboxComponent;
    @ViewChild('holdingsProfileSelector', { static: true })
        private holdingsProfileSelector: ComboboxComponent;
    @ViewChild('mergeProfileSelector', { static: true })
        private mergeProfileSelector: ComboboxComponent;
    @ViewChild('fallThruMergeProfileSelector', { static: true })
        private fallThruMergeProfileSelector: ComboboxComponent;
    @ViewChild('queueSelector') private queueSelector: ComboboxComponent;
    @ViewChild('bucketSelector') private bucketSelector: ComboboxComponent;

    @ViewChild('dupeQueueAlert', { static: true })
        private dupeQueueAlert: AlertDialogComponent;

    constructor(
        private http: HttpClient,
        private toast: ToastService,
        private evt: EventService,
        private net: NetService,
        private auth: AuthService,
        private org: OrgService,
        private store: ServerStoreService,
        private vandelay: VandelayService
    ) {
    }

    applyDefaults() {
        this.minQualityRatio = 0;
        this.selectedBibSource = 1; // default to system local
        this.recordType = 'bib';
        this.bibTrashGroups = [];
        this.formTemplates = {};

        if (this.vandelay.importSelection) {
            // Apply start-id values to our comboboxes based on our
            // import selection values.
            const queue = this.vandelay.importSelection.queue;

            if (!queue) {
                // Incomplete import selection, clear it.
                this.vandelay.importSelection = null;
                return;
            }

            this.recordType = queue.queue_type();
            this.startQueueId = queue.id();
            this.selectedMatchSet = queue.match_set();

            if (this.recordType === 'bib') {
                this.selectedBucket = queue.match_bucket();
                this.selectedHoldingsProfile = queue.item_attr_def();
            }
        }
    }

    applyImportSelection() {

        // Depending on when the comboboxes are rendered, the start-id values
        // applied in applyDefaults() may not have any affect.  Ensure we
        // get the initial values we want by manually setting selectedIds
        // to the rendered combobox as well.

        const queue = this.vandelay.importSelection.queue;
        if (!queue) {
            // Incomplete import selection, clear it.
            this.vandelay.importSelection = null;
            return;
        }

        if (this.queueSelector) {
            this.queueSelector.selectedId = this.startQueueId;
            this.selectedQueue = {id: queue.id(), label: queue.name()};
        }

        if (this.matchSetSelector) {
            this.matchSetSelector.selectedId = this.selectedMatchSet;
        }

        if (this.recordType === 'bib') {
            if (this.holdingsProfileSelector) {
                this.holdingsProfileSelector.selectedId = this.selectedHoldingsProfile;
            }
            if (this.bucketSelector) {
                this.bucketSelector.selectedId = this.selectedBucket;
            }
        }
    }

    ngOnInit() {
        this.applyDefaults();
    }

    ngAfterViewInit() {
        if (this.vandelay.importSelection) {
            // setTimeout() is not required here, but it helps to
            // avoid expression-changed-after-checking console messages.
            setTimeout(() => this.applyImportSelection());
        }
        this.loadStartupData();
    }

    ngOnDestroy() {
        // Always clear the import selection when navigating away from
        // the import page.
        this.clearSelection();
    }

    importSelection(): VandelayImportSelection {
        return this.vandelay.importSelection;
    }

    loadStartupData(): Promise<any> {
        // Note displaying and manipulating a progress dialog inside
        // the AfterViewInit cycle leads to errors because the child
        // component is modifed after dirty checking.

        const promises = [
            this.vandelay.getMergeProfiles(),
            this.vandelay.getAllQueues('bib'),
            this.vandelay.getAllQueues('authority'),
            this.vandelay.getMatchSets('bib'),
            this.vandelay.getMatchSets('authority'),
            this.vandelay.getBibBuckets(),
            this.vandelay.getBibSources(),
            this.vandelay.getItemImportDefs(),
            this.vandelay.getBibTrashGroups().then(
                groups => this.bibTrashGroups = groups),
            this.org.settings(['vandelay.default_match_set']).then(
                s => this.defaultMatchSet = s['vandelay.default_match_set']),
            this.loadTemplates()
        ];

        return Promise.all(promises);
    }

    loadTemplates() {
        this.store.getItem(TEMPLATE_SETTING_NAME).then(
            templates => {
                this.formTemplates = templates || {};

                Object.keys(this.formTemplates).forEach(name => {
                    if (this.formTemplates[name].default) {
                        this.selectedTemplate = name;
                    }
                });
            }
        );
    }

    formatTemplateEntries(): ComboboxEntry[] {
        const entries = [];

        Object.keys(this.formTemplates || {}).forEach(
            name => entries.push({id: name, label: name}));

        return entries;
    }

    // Format typeahead data sets
    formatEntries(etype: string): ComboboxEntry[] {
        const rtype = this.recordType;
        let list;

        switch (etype) {
            case 'bibSources':
                return (this.vandelay.bibSources || []).map(
                    s => {
                        return {id: s.id(), label: s.source()};
                    });

            case 'bibBuckets':
                list = this.vandelay.bibBuckets;
                break;

            case 'activeQueues':
                list = (this.vandelay.allQueues[rtype] || [])
                        .filter(q => q.complete() === 'f');
                break;

            case 'matchSets':
                list = this.vandelay.matchSets[rtype];
                break;

            case 'importItemDefs':
                list = this.vandelay.importItemAttrDefs;
                break;

            case 'mergeProfiles':
                list = this.vandelay.mergeProfiles;
                break;
        }

        return (list || []).map(item => {
            return {id: item.id(), label: item.name()};
        });
    }

    selectEntry($event: ComboboxEntry, etype: string) {
        const id = $event ? $event.id : null;

        switch (etype) {
            case 'recordType':
                this.recordType = id;
                break;

            case 'bibSources':
                this.selectedBibSource = id;
                break;

            case 'bibBuckets':
                this.selectedBucket = id;
                break;

            case 'matchSets':
                this.selectedMatchSet = id;
                break;

            case 'importItemDefs':
                this.selectedHoldingsProfile = id;
                break;

            case 'mergeProfiles':
                this.selectedMergeProfile = id;
                break;

            case 'FallThruMergeProfile':
                this.selectedFallThruMergeProfile = id;
                break;
        }
    }

    fileSelected($event) {
       this.selectedFile = $event.target.files[0];
    }

    // Required form data varies depending on context.
    hasNeededData(): boolean {
        if (this.vandelay.importSelection) {
            return this.importActionSelected();
        } else {
            return this.selectedQueue &&
                Boolean(this.recordType) && Boolean(this.selectedFile);
        }
    }

    importActionSelected(): boolean {
        return this.importNonMatching
            || this.mergeOnExact
            || this.mergeOnSingleMatch
            || this.mergeOnBestMatch;
    }

    // 1. create queue if necessary
    // 2. upload MARC file
    // 3. Enqueue MARC records
    // 4. Import records
    upload() {
        this.sessionKey = null;
        this.showProgress = true;
        this.isUploading = true;
        this.uploadComplete = false;
        this.resetProgressBars();

        this.resolveQueue()
        .then(
            queueId => {
                this.activeQueueId = queueId;
                return this.uploadFile();
            },
            err => Promise.reject('queue create failed')
        ).then(
            ok => this.processSpool(),
            err => Promise.reject('process spool failed')
        ).then(
            ok => this.importRecords(),
            err => Promise.reject('import records failed')
        ).then(
            ok => {
                this.isUploading = false;
                this.uploadComplete = true;
            },
            err => {
                console.log('file upload failed: ', err);
                this.isUploading = false;
                this.resetProgressBars();

            }
        );
    }

    resetProgressBars() {
        this.uploadProgress.update({value: 0, max: 1});
        this.enqueueProgress.update({value: 0, max: 1});
        this.importProgress.update({value: 0, max: 1});
    }

    // Extract selected queue ID or create a new queue when requested.
    resolveQueue(): Promise<number> {

        if (this.selectedQueue.freetext) {
            // Free text queue selector means create a new entry.
            // TODO: first check for name dupes

            return this.vandelay.createQueue(
                this.selectedQueue.label,
                this.recordType,
                this.selectedHoldingsProfile,
                this.selectedMatchSet,
                this.selectedBucket
            ).then(
                id => id,
                err => {
                    const evt = this.evt.parse(err);
                    if (evt) {
                        if (evt.textcode.match(/QUEUE_EXISTS/)) {
                            this.dupeQueueAlert.open();
                        } else {
                            alert(evt); // server error
                        }
                    }

                    return Promise.reject('Queue Create Failed');
                }
            );
        } else {
            return Promise.resolve(this.selectedQueue.id);
        }
    }

    uploadFile(): Promise<any> {

        if (this.vandelay.importSelection) {
            // Nothing to upload when processing pre-queued records.
            return Promise.resolve();
        }

        const formData: FormData = new FormData();

        formData.append('ses', this.auth.token());
        formData.append('marc_upload',
            this.selectedFile, this.selectedFile.name);

        if (this.selectedBibSource) {
            formData.append('bib_source', '' + this.selectedBibSource);
        }

        const req = new HttpRequest('POST', VANDELAY_UPLOAD_PATH, formData,
            {reportProgress: true, responseType: 'text'});

        return this.http.request(req).pipe(tap(
            evt => {
                if (evt.type === HttpEventType.UploadProgress) {
                    this.uploadProgress.update(
                        {value: evt.loaded, max: evt.total});

                } else if (evt instanceof HttpResponse) {
                    this.sessionKey = evt.body as string;
                    console.log(
                        'Vandelay file uploaded OK with key ' + this.sessionKey);
                }
            },

            (err: HttpErrorResponse) => {
                console.error(err);
                this.toast.danger(err.error);
            }
        )).toPromise();
    }

    processSpool():  Promise<any> {

        if (this.vandelay.importSelection) {
            // Nothing to enqueue when processing pre-queued records
            return Promise.resolve();
        }

        let spoolType = this.recordType;
        if (this.recordType === 'authority') {
            spoolType = 'auth';
        }

        const method = `open-ils.vandelay.${spoolType}.process_spool`;

        return new Promise((resolve, reject) => {
            this.net.request(
                'open-ils.vandelay', method,
                this.auth.token(), this.sessionKey, this.activeQueueId,
                null, null, this.selectedBibSource,
                (this.sessionName || null), true
            ).subscribe(
                tracker => {
                    const e = this.evt.parse(tracker);
                    if (e) { console.error(e); return reject(); }

                    // Spooling is in progress, track the results.
                    this.vandelay.pollSessionTracker(tracker.id())
                    .subscribe(
                        trkr => {
                            this.enqueueProgress.update({
                                // enqueue API only tracks actions performed
                                max: null,
                                value: trkr.actions_performed()
                            });
                        },
                        err => { console.log(err); reject(); },
                        () => {
                            this.enqueueProgress.update({max: 1, value: 1});
                            resolve(null);
                        }
                    );
                }
            );
        });
    }

    importRecords(): Promise<any> {

        if (!this.importActionSelected()) {
            return Promise.resolve();
        }

        const selection = this.vandelay.importSelection;

        if (selection && !selection.importQueue) {
            return this.importRecordQueue(selection.recordIds);
        } else {
            return this.importRecordQueue();
        }
    }

    importRecordQueue(recIds?: number[]): Promise<any> {
        const rtype = this.recordType === 'bib' ? 'bib' : 'auth';

        let method = `open-ils.vandelay.${rtype}_queue.import`;
        const options: ImportOptions = this.compileImportOptions();

        let target: number | number[] = this.activeQueueId;
        if (recIds && recIds.length) {
            method = `open-ils.vandelay.${rtype}_record.list.import`;
            target = recIds;
        }

        return new Promise((resolve, reject) => {
            this.net.request('open-ils.vandelay',
                method, this.auth.token(), target, options)
            .subscribe(
                tracker => {
                    const e = this.evt.parse(tracker);
                    if (e) { console.error(e); return reject(); }

                    // Spooling is in progress, track the results.
                    this.vandelay.pollSessionTracker(tracker.id())
                    .subscribe(
                        trkr => {
                            this.importProgress.update({
                                max: trkr.total_actions(),
                                value: trkr.actions_performed()
                            });
                        },
                        err => { console.log(err); reject(); },
                        () => {
                            this.importProgress.update({max: 1, value: 1});
                            resolve(null);
                        }
                    );
                }
            );
        });
    }

    compileImportOptions(): ImportOptions {

        const options: ImportOptions = {
            session_key: this.sessionKey,
            import_no_match: this.importNonMatching,
            auto_overlay_exact: this.mergeOnExact,
            auto_overlay_best_match: this.mergeOnBestMatch,
            auto_overlay_1match: this.mergeOnSingleMatch,
            opp_acq_copy_overlay: this.autoOverlayAcqCopies,
            opp_oo_cat_copy_overlay: this.autoOverlayOnOrderCopies,
            auto_overlay_org_unit_copies: this.autoOverlayOrgUnitCopies,
            merge_profile: this.selectedMergeProfile,
            fall_through_merge_profile: this.selectedFallThruMergeProfile,
            strip_field_groups: this.selectedTrashGroups,
            match_quality_ratio: this.minQualityRatio,
            exit_early: true
        };

        if (this.vandelay.importSelection) {
            options.overlay_map = this.vandelay.importSelection.overlayMap;
        }

        return options;
    }

    clearSelection() {
        this.vandelay.importSelection = null;
        this.startQueueId = null;
    }

    openQueue() {
        console.log('opening queue ' + this.activeQueueId);
    }

    saveTemplate() {

        const template = {};
        TEMPLATE_ATTRS.forEach(key => template[key] = this[key]);

        console.debug('Saving import profile', template);

        this.formTemplates[this.selectedTemplate] = template;
        return this.store.setItem(TEMPLATE_SETTING_NAME, this.formTemplates);
    }

    markTemplateDefault() {

        Object.keys(this.formTemplates).forEach(
            name => delete this.formTemplates.default
        );

        this.formTemplates[this.selectedTemplate].default = true;

        return this.store.setItem(TEMPLATE_SETTING_NAME, this.formTemplates);
    }

    templateSelectorChange(entry: ComboboxEntry) {

        if (!entry) {
            this.selectedTemplate = '';
            return;
        }

        this.selectedTemplate = entry.label; // label == name

        if (entry.freetext) {
            // User is entering a new template name.
            // Nothing to apply.
            return;
        }

        // User selected an existing template, apply it to the form.

        const template = this.formTemplates[entry.id];

        // Copy the template values into "this"
        TEMPLATE_ATTRS.forEach(key => this[key] = template[key]);

        // Some values must be manually passed to the combobox'es

        this.recordTypeSelector.applyEntryId(this.recordType);
        this.bibSourceSelector.applyEntryId(this.selectedBibSource);
        this.matchSetSelector.applyEntryId(this.selectedMatchSet);
        this.holdingsProfileSelector
            .applyEntryId(this.selectedHoldingsProfile);
        this.mergeProfileSelector.applyEntryId(this.selectedMergeProfile);
        this.fallThruMergeProfileSelector
            .applyEntryId(this.selectedFallThruMergeProfile);
    }

    deleteTemplate() {
        delete this.formTemplates[this.selectedTemplate];
        this.formTemplateSelector.selected = null;
        return this.store.setItem(TEMPLATE_SETTING_NAME, this.formTemplates);
    }
}

