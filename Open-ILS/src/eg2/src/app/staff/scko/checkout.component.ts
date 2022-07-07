import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import {Router, ActivatedRoute, NavigationEnd} from '@angular/router';
import {AuthService} from '@eg/core/auth.service';
import {IdlObject} from '@eg/core/idl.service';
import {SckoService} from './scko.service';
import {ServerStoreService} from '@eg/core/server-store.service';

@Component({
  templateUrl: 'checkout.component.html'
})

export class SckoCheckoutComponent implements OnInit {

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        public  scko: SckoService
    ) {}

    ngOnInit() {
    }

    printList() {
        this.scko.printReceipt();
    }
}

