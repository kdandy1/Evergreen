import {Component, Input, Output, OnInit, Host, TemplateRef, EventEmitter} from '@angular/core';
import {GridToolbarButton} from './grid';
import {GridComponent} from './grid.component';

@Component({
    selector: 'eg-grid-toolbar-button',
    template: '<ng-template></ng-template>'
})

export class GridToolbarButtonComponent implements OnInit {

    // Note most input fields should match class fields for GridColumn
    @Input() label: string;

    // These are optional labels that can come before and after the button
    @Input() adjacentPreceedingLabel = '';
    @Input() adjacentSubsequentLabel = '';

    // Register to click events
    @Output() onClick: EventEmitter<any>;

    // DEPRECATED: Pass a reference to a function that is called on click.
    @Input() action: () => any;

    // Provide a router link instead of an onClick handler
    @Input() routerLink: string;

    @Input() set disabled(d: boolean) {
        // Support asynchronous disabled values by appling directly
        // to our button object as values arrive.
        if (this.button) {
            this.button.disabled = d;
        }
    }

    button: GridToolbarButton;

    // get a reference to our container grid.
    constructor(@Host() private grid: GridComponent) {
        this.onClick = new EventEmitter<any>();
        this.button = new GridToolbarButton();
    }

    ngOnInit() {
        if (!this.grid) {
            console.warn('GridToolbarButtonComponent needs a [grid]');
            return;
        }

        this.button.onClick = this.onClick;
        this.button.routerLink = this.routerLink;
        this.button.label = this.label;
        this.button.adjacentPreceedingLabel = this.adjacentPreceedingLabel;
        this.button.adjacentSubsequentLabel = this.adjacentSubsequentLabel;
        this.button.action = this.action;
        this.grid.context.toolbarButtons.push(this.button);
    }
}

