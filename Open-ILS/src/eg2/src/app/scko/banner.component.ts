import {Component, OnInit, AfterViewInit, NgZone, HostListener} from '@angular/core';
import {Location} from '@angular/common';
import {Router, ActivatedRoute, NavigationEnd} from '@angular/router';
import {AuthService, AuthWsState} from '@eg/core/auth.service';
import {NetService} from '@eg/core/net.service';
import {StoreService} from '@eg/core/store.service';
import {SckoService} from './scko.service';
import {OrgService} from '@eg/core/org.service';
import {EventService, EgEvent} from '@eg/core/event.service';

@Component({
  selector: 'eg-scko-banner',
  templateUrl: 'banner.component.html'
})

export class SckoBannerComponent implements OnInit, AfterViewInit {

    workstations: any[];
    workstationNotFound = false;

    patronUsername: string;
    patronPassword: string;
    patronLoginFailed = false;

    staffUsername: string;
    staffPassword: string;
    staffWorkstation: string;
    staffLoginFailed = false;

    itemBarcode: string;

    constructor(
        private route: ActivatedRoute,
        private store: StoreService,
        private net: NetService,
        private auth: AuthService,
        private evt: EventService,
        private ngLocation: Location,
        private org: OrgService,
        public scko: SckoService
    ) {}

    ngOnInit() {

        // NOTE: Displaying a list of workstations will not work for users
        // of Hatch until the extension is updated to support /eg2/*/scko
        this.store.getWorkstations()
        .then(wsList => {
            this.workstations = wsList;
            return this.store.getDefaultWorkstation();
        }).then(def => {
            this.staffWorkstation = def;
            this.applyWorkstation();
        });
    }

    ngAfterViewInit() {
        if (this.auth.token()) {
            this.focusNode('patron-username');
        } else {
            this.focusNode('staff-username');
        }

        this.scko.focusBarcode.subscribe(_ => this.focusNode('item-barcode'));
    }

    focusNode(id: string) {
        setTimeout(() => {
            const node = document.getElementById(id);
            if (node) { (node as HTMLInputElement).select(); }
        });
    }

    applyWorkstation() {
        const wanted = this.route.snapshot.queryParamMap.get('workstation');
        if (!wanted) { return; } // use the default

        const exists = this.workstations.filter(w => w.name === wanted)[0];
        if (exists) {
            this.staffWorkstation = wanted;
        } else {
            console.error(`Unknown workstation requested: ${wanted}`);
        }
    }

    submitStaffLogin() {

        this.staffLoginFailed = false;

        const args = {
            type: 'persistent',
            username: this.staffUsername,
            password: this.staffPassword,
            workstation: this.staffWorkstation
        };

        this.staffLoginFailed = false;
        this.workstationNotFound = false;

        this.auth.login(args).then(
            ok => {

                if (this.auth.workstationState === AuthWsState.NOT_FOUND_SERVER) {
                    this.staffLoginFailed = true;
                    this.workstationNotFound = true;

                } else {

                    // Initial login clears cached org unit setting values
                    // and user/workstation setting values
                    this.org.clearCachedSettings().then(_ => {

                        // Force reload of the app after a successful login.
                        window.location.href =
                            this.ngLocation.prepareExternalUrl('/scko');

                    });
                }
            },
            notOk => {
                this.staffLoginFailed = true;
            }
        );
    }

    submitPatronLogin() {
        this.patronLoginFailed = false;
        this.scko.loadPatron(this.patronUsername, this.patronPassword).finally(() => {
            if (this.scko.patronSummary === null) {
                this.patronLoginFailed = true;
            } else {
                this.focusNode('item-barcode');
            }
        });
    }

    submitItemBarcode() {
        this.scko.resetPatronTimeout();
        this.scko.checkout(this.itemBarcode);
    }
}

