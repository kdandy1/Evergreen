# ---------------------------------------------------------------
# Copyright (C) 2020 King County Library System
# Bill Erickson <berickxx@gmail.com>
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# ---------------------------------------------------------------
# Code borrows heavily and sometimes copies directly from from
# ../SIP* and SIPServer*
# ---------------------------------------------------------------
package OpenILS::WWW::SIP2Mediator;
use strict; use warnings;
use Apache2::Const -compile =>
    qw(OK FORBIDDEN NOT_FOUND HTTP_INTERNAL_SERVER_ERROR HTTP_BAD_REQUEST);
use Apache2::RequestRec;
use CGI;
use JSON::XS;
use OpenSRF::System;
use OpenSRF::Utils::Logger q/$logger/;
use OpenILS::Application::AppUtils;
my $U = 'OpenILS::Application::AppUtils';

my $json = JSON::XS->new;
$json->ascii(1);
$json->allow_nonref(1);

my $osrf_config;
sub import {
    $osrf_config = shift;
}

my $init_complete = 0;
sub init {
    return if $init_complete;
    $init_complete = 1;
    OpenSRF::System->bootstrap_client(config_file => $osrf_config);
}

sub handler {
    my $r = shift;
    my $cgi = CGI->new;
    my ($message, $msg_code);

    init();

    my $seskey = $cgi->param('session');
    my $msg_json = $cgi->param('message');

    # sip2-mediator generates a unique key for each client session.
    # This key is required even if the client has not yet authenticated.
    return Apache2::Const::FORBIDDEN unless $seskey;

    if ($msg_json) {
        eval { $message = $json->decode($msg_json) };
        if ($message) {
            $msg_code = $message->{code};
        } else {
            $logger->error("SIP2: Error parsing message JSON: $@ : $msg_json");
        }
    }

    return Apache2::Const::HTTP_BAD_REQUEST unless $msg_code;

    my $response = $U->simplereq(
        'open-ils.sip2',
        'open-ils.sip2.request', $seskey, $message);

    if (!$response) {

        $logger->error("SIP2: API Request returned no value for: $msg_json");
        return Apache2::Const::HTTP_INTERNAL_SERVER_ERROR;

    } elsif (my $textcode = $response->{textcode}) {

        # SIP API returned a failure event
        $logger->error("SIP2: API request returned $textcode: $msg_json");

        return Apache2::Const::FORBIDDEN if $textcode eq 'PERM_FAILURE';

        return Apache2::Const::HTTP_BAD_REQUEST;
    }

    $r->content_type('application/json');
    # response = $VAR1 = {'fields' => [{'AO' => 'example'},{'BX' => 'YYYNYNYYNYYNNNYN'}],'fixed_fields' => ['Y','Y','Y','Y','N','N','999','999','20220706    154418','2.00'],'code' => '98'};
    # filters v1 = $VAR1 = { 'field' => { 'identifier' => 'AE',  'replace_with' => 'John Doe' } };
    # filters v1 = $VAR1 = { 'field' => { 'identifier' => 'AE',  'remove' => 'true' } };
    # filters v1 = $VAR1 = { 'field' => [ { 'identifier' => 'AE', 'replace_with' => 'John Doe' }, { 'replace_with' => 'Jane Doe', 'identifier' => 'AE' } ] };
    my $filters = { 'field' => [ { 'identifier' => 'AE', 'replace_with' => 'John Doe' }, { 'replace_with' => 'Jane Doe', 'identifier' => 'AE' } ] };

    sub find_field_config {
        my $field_id = shift;
        my @relavent_field_configs = grep { $_->{identifier} eq $field_id } @{ $filters->{'field'} };
        # since we can't do anything complicated yet, let's just return the first match
        return @relavent_field_configs ? $relavent_field_configs[0] : undef;
    }

    if (defined $filters && defined $response->{fields} && ref $response->{fields} eq 'ARRAY') {
        $response->{fields} = [
            grep {
                my $keep = 1;
                my @fids = keys(%{$_});
                my $fid = $fids[0];
                my $field_config = find_field_config( $fid );
                if ($field_config && defined $field_config->{remove}) {
                    if (($field_config->{remove} =~ /true|y|yes/i)) { # test truthiness
                        $keep = 0; # strip the entire field
                    }
                }
                $keep; # or not
            }
            map {
                my @fids = keys(%{$_});
                my $fid = $fids[0];
                my $field_config = find_field_config( $fid );
                $field_config && defined $field_config->{replace_with}
                    ? { $fid => $field_config->{replace_with} }
                    : $_;
            }
            @{ $response->{fields} }
        ];
    }
    $r->print($json->encode($response));
    return Apache2::Const::OK;
}

1;
