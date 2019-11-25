import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AdminServerSplashComponent} from './admin-server-splash.component';
import {BasicAdminPageComponent} from '@eg/staff/admin/basic-admin-page.component';
import {OrgUnitTypeComponent} from './org-unit-type.component';
import {PrintTemplateComponent} from './print-template.component';
import {PermGroupTreeComponent} from './perm-group-tree.component';

const routes: Routes = [{
    path: 'splash',
    component: AdminServerSplashComponent
}, {
    path: 'actor/org_unit_type',
    component: OrgUnitTypeComponent
}, {
    path: 'config/floating_group',
    loadChildren: () =>
      import('./floating-group/floating-group.module').then(m => m.FloatingGroupModule)
}, {
    path: 'config/print_template',
    component: PrintTemplateComponent
}, {
    path: 'permission/grp_tree',
    component: PermGroupTreeComponent
}, {
    path: 'actor/org_unit',
    loadChildren: () =>
      import('./org-unit.module').then(m => m.OrgUnitModule)
}, {
    path: 'actor/org_unit_proximity_adjustment',
    component: BasicAdminPageComponent,
    data: [{schema: 'actor',
        table: 'org_unit_proximity_adjustment', disableOrgFilter: true}]
}, {
    path: 'asset/call_number_prefix',
    component: BasicAdminPageComponent,
    data: [{schema: 'asset',
        table: 'call_number_prefix', readonlyFields: 'label_sortkey'}]
}, {
    path: 'asset/call_number_suffix',
    component: BasicAdminPageComponent,
    data: [{schema: 'asset',
        table: 'call_number_suffix', readonlyFields: 'label_sortkey'}]
}, {
    path: ':schema/:table',
    component: BasicAdminPageComponent
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class AdminServerRoutingModule {}
