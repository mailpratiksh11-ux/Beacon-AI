import { Component, ElementRef, ViewChild, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  LucideAngularModule, Bold, Italic, Underline, List, Link2, Send, Save,
  Users, Upload, X, FileText, Paperclip, Clock, Layers, Eye, Braces, UserPlus, Megaphone, Check, Loader2, Sparkles, RefreshCw,
} from 'lucide-angular';
import { PageHeader } from '../shared/page-header';
import { SendProgressModal, SendProgress } from '../shared/send-progress-modal';
import { ToastService } from '../core/toast.service';
import { ConfirmService } from '../core/confirm.service';
import { ProfileService } from '../core/profile.service';
import { ApiService } from '../core/api.service';
import { DataService } from '../core/data.service';
import { SendService } from '../core/send.service';
import { Resume } from '../core/models';
import { parseContactsCsv } from '../core/csv-parser';

interface CsvRow { name: string; company: string; email: string; position?: string; }

@Component({
  selector: 'app-compose',
  standalone: true,
  imports: [LucideAngularModule, FormsModule, RouterLink, PageHeader, SendProgressModal],
  template: `
    <app-page-header title="Compose Email" subtitle="Craft a personalized campaign and send it to your recipients.">
      <button class="btn-secondary" (click)="saveCampaign()"><lucide-icon [img]="SaveIcon" [size]="16" /> Save as Campaign</button>
    </app-page-header>

    @if (campaignName()) {
      <div class="mb-5 flex items-center gap-3 rounded-xl border border-brand-200 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-500/10 px-4 py-3">
        <lucide-icon [img]="MegaphoneIcon" [size]="18" class="text-brand-500 shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-slate-900 dark:text-white truncate">Campaign: {{ campaignName() }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ recipientCount() }} recipient{{ recipientCount() === 1 ? '' : 's' }} remaining to send</p>
        </div>
      </div>
    }

    <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <!-- ============ LEFT: EDITOR ============ -->
      <div class="xl:col-span-3 space-y-6">
        <!-- Subject + editor -->
        <div class="card p-5">
          @if (profile.aiEnabled()) {
            <div class="mb-4">
              @if (!aiOpen()) {
                <button type="button" (click)="aiOpen.set(true)" class="ai-glow w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
                  <lucide-icon [img]="Spark" [size]="16" /> Write with AI
                </button>
              } @else {
                <div class="rounded-xl border border-brand-500/40 bg-brand-500/[0.05] p-3 space-y-2.5"
                     style="box-shadow:0 0 0 1px rgba(14,165,233,.15), 0 12px 40px -18px rgba(14,165,233,.5)">
                  <div class="flex items-center gap-2">
                    <lucide-icon [img]="Spark" [size]="16" class="text-brand-500" />
                    <span class="text-sm font-medium text-slate-800 dark:text-slate-100">Write with AI</span>
                    <span class="text-[11px] text-slate-400">{{ aiModelLabel() }}</span>
                    <button class="btn-icon h-7 w-7 ml-auto" (click)="aiOpen.set(false)"><lucide-icon [img]="XIcon" [size]="14" /></button>
                  </div>
                  <textarea class="input min-h-[64px] resize-y" [placeholder]="aiPlaceholder()" [(ngModel)]="aiPrompt" [disabled]="!!aiBusy()"></textarea>
                  <div class="flex flex-wrap items-center gap-2">
                    <select class="input w-auto py-2" [(ngModel)]="aiTone" [disabled]="!!aiBusy()">
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="direct">Direct</option>
                      <option value="enthusiastic">Enthusiastic</option>
                    </select>
                    <button class="btn-secondary ml-auto" (click)="improveAi()" [disabled]="aiBusy() || !hasDraft()" title="Rewrite your current message">
                      @if (aiBusy() === 'improve') { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> } @else { <lucide-icon [img]="RefreshIcon" [size]="16" /> }
                      Improve current
                    </button>
                    <button class="btn-primary" (click)="generateAi()" [disabled]="!aiPrompt.trim() || aiBusy()">
                      @if (aiBusy() === 'generate') { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Writing… }
                      @else { <lucide-icon [img]="Spark" [size]="16" /> Generate }
                    </button>
                  </div>
                </div>
              }
            </div>
          }
          @if (data.templates().length || historyOptions().length) {
            <div class="mb-4 flex flex-wrap items-center gap-2">
              @if (data.templates().length) {
                <span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400"><lucide-icon [img]="FileIcon" [size]="14" /> Template</span>
                <select class="input w-auto py-2 text-sm" [ngModel]="templatePick()" (ngModelChange)="useTemplate($event)">
                  <option value="">Choose a template…</option>
                  @for (t of data.templates(); track t.id) { <option [value]="t.id">{{ t.name }}</option> }
                </select>
              }
              @if (historyOptions().length) {
                <span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400"><lucide-icon [img]="Clock" [size]="14" /> History</span>
                <select class="input w-auto py-2 text-sm max-w-[240px]" [ngModel]="historyPick()" (ngModelChange)="useHistory($event)">
                  <option value="">Reuse a sent email…</option>
                  @for (h of historyOptions(); track h.id) { <option [value]="h.id">{{ h.subject || '(no subject)' }} · {{ h.recipient }}</option> }
                </select>
              }
              <a routerLink="/templates" class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline ml-auto">Manage templates</a>
            </div>
          }

          <label class="label">Subject</label>
          <input class="input mb-4" placeholder="Opportunities at {{ '{{' }}company{{ '}}' }}" [(ngModel)]="subject" (ngModelChange)="subjectSig.set($event)" />

          <label class="label">Message</label>
          <!-- toolbar -->
          <div class="flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2 py-1.5">
            <button class="btn-icon h-8 w-8" title="Bold" (click)="format('bold')"><lucide-icon [img]="BoldIcon" [size]="16" /></button>
            <button class="btn-icon h-8 w-8" title="Italic" (click)="format('italic')"><lucide-icon [img]="ItalicIcon" [size]="16" /></button>
            <button class="btn-icon h-8 w-8" title="Underline" (click)="format('underline')"><lucide-icon [img]="UnderlineIcon" [size]="16" /></button>
            <div class="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button class="btn-icon h-8 w-8" title="Bullet list" (click)="format('insertUnorderedList')"><lucide-icon [img]="ListIcon" [size]="16" /></button>
            <button class="btn-icon h-8 w-8" title="Insert link" (click)="addLink()"><lucide-icon [img]="LinkIcon" [size]="16" /></button>
            <div class="flex-1"></div>
            <span class="text-[11px] text-slate-400 pr-1">Rich text</span>
          </div>
          <!-- editable area -->
          <div #editor contenteditable="true"
               class="min-h-[220px] rounded-b-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3
                      text-sm text-slate-700 dark:text-slate-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500/30 prose-editor"
               (input)="onEditorInput()"></div>

          <!-- variable chips -->
          <div class="mt-3">
            <p class="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5"><lucide-icon [img]="BracesIcon" [size]="13" /> Insert variable</p>
            <div class="flex flex-wrap gap-2">
              @for (v of variables; track v) {
                <button class="badge-info hover:bg-brand-100 dark:hover:bg-brand-500/25 transition-colors font-mono" (click)="insertVariable(v)">
                  {{ '{{' }}{{ v }}{{ '}}' }}
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Recipients -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <lucide-icon [img]="UsersIcon" [size]="18" class="text-brand-500" />
              <h2 class="font-semibold text-slate-900 dark:text-white">Recipients</h2>
            </div>
            <button class="btn-secondary h-9 px-3 text-xs" (click)="openContacts()">
              <lucide-icon [img]="UserPlusIcon" [size]="15" /> Add from Contacts
            </button>
          </div>

          <!-- tabs -->
          <div class="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-4">
            <button class="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors"
                    [class]="recipientTab() === 'paste' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'"
                    (click)="recipientTab.set('paste')">Paste emails</button>
            <button class="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors"
                    [class]="recipientTab() === 'csv' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'"
                    (click)="recipientTab.set('csv')">Upload CSV</button>
          </div>

          @if (recipientTab() === 'paste') {
            <textarea class="input font-mono text-xs min-h-[110px]" rows="4"
                      placeholder="john@gmail.com&#10;alex@gmail.com&#10;emma@gmail.com"
                      [(ngModel)]="rawEmails" (ngModelChange)="parseEmails()"></textarea>

            <div class="flex items-center justify-between mt-3">
              <p class="text-sm text-slate-500 dark:text-slate-400">Total Emails: <span class="font-semibold text-slate-900 dark:text-white tabular-nums">{{ emailChips().length }}</span></p>
              @if (emailChips().length) {
                <button class="text-xs font-medium text-red-500 hover:underline" (click)="clearEmails()">Clear all</button>
              }
            </div>

            @if (emailChips().length) {
              <div class="flex flex-wrap gap-2 mt-3 max-h-40 overflow-y-auto p-0.5">
                @for (e of emailChips(); track e) {
                  <span class="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 pl-2.5 pr-1.5 py-1 text-xs text-slate-700 dark:text-slate-200 animate-scale-in">
                    {{ e }}
                    <button class="hover:text-red-500 transition-colors" (click)="removeEmail(e)"><lucide-icon [img]="XIcon" [size]="13" /></button>
                  </span>
                }
              </div>
            }
          } @else {
            <!-- CSV upload -->
            <label class="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/40 dark:hover:bg-brand-500/5 transition-colors p-8 text-center"
                   (dragover)="$event.preventDefault()" (drop)="onCsvDrop($event)">
              <input type="file" accept=".csv" class="hidden" (change)="onCsvSelect($event)" />
              <div class="h-11 w-11 mx-auto rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-3">
                <lucide-icon [img]="UploadIcon" [size]="20" class="text-brand-500" />
              </div>
              <p class="text-sm font-medium text-slate-700 dark:text-slate-200">Drag & drop your CSV here, or <span class="text-brand-600 dark:text-brand-400">browse</span></p>
              <p class="text-xs text-slate-400 mt-1">Auto-detects the Email / Name / Company columns. From Excel or Google Sheets: <span class="font-mono">File → Download → CSV</span>.</p>
            </label>

            @if (csvRows().length) {
              <div class="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <span class="text-xs font-semibold text-slate-500">Preview — {{ csvRows().length }} recipients · scroll to view all</span>
                  <button class="text-xs text-red-500 hover:underline" (click)="csvRows.set([])">Remove</button>
                </div>
                <div class="max-h-72 overflow-y-auto">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0 z-10">
                      <tr class="text-left text-slate-400 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                        <th class="px-4 py-2 font-medium bg-white dark:bg-slate-900">Name</th>
                        <th class="px-4 py-2 font-medium bg-white dark:bg-slate-900">Company</th>
                        <th class="px-4 py-2 font-medium bg-white dark:bg-slate-900">Email</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                      @for (r of csvRows(); track r.email) {
                        <tr><td class="px-4 py-2 text-slate-700 dark:text-slate-200">{{ r.name }}</td><td class="px-4 py-2 text-slate-500">{{ r.company }}</td><td class="px-4 py-2 text-slate-500 font-mono">{{ r.email }}</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          }
        </div>

        <!-- Attachments (upload one or more, sent with every email) -->
        <div class="card p-5">
          <div class="flex items-center gap-2 mb-4">
            <lucide-icon [img]="Clip" [size]="18" class="text-brand-500" />
            <h2 class="font-semibold text-slate-900 dark:text-white">Attachments</h2>
            @if (attachments().length) { <span class="badge-info ml-auto tabular-nums">{{ attachments().length }}</span> }
          </div>

          <input #attachInput type="file" multiple class="hidden" (change)="onAttachSelected($event)" />

          @for (a of attachments(); track a.id) {
            <div class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 mb-2">
              <div class="h-9 w-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
                <lucide-icon [img]="FileIcon" [size]="16" class="text-brand-500" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{{ a.filename }}</p>
                <p class="text-xs text-slate-400 tabular-nums">{{ fmtSize(a.size) }}</p>
              </div>
              <button class="btn-icon h-8 w-8 hover:text-red-500" (click)="removeAttachment(a.id)" title="Remove"><lucide-icon [img]="XIcon" [size]="15" /></button>
            </div>
          }

          <button type="button" (click)="attachInput.click()" [disabled]="uploadingAttach()"
                  class="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-500 hover:border-brand-400 dark:hover:border-brand-500/60 transition-colors disabled:opacity-60">
            @if (uploadingAttach()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Uploading… }
            @else { <lucide-icon [img]="UploadIcon" [size]="16" /> {{ attachments().length ? 'Add more files' : 'Add files' }} }
          </button>

          @if (!attachments().length) {
            @if (defaultResume(); as r) {
              <p class="text-xs text-slate-400 mt-3">Or your default resume <span class="text-slate-500 dark:text-slate-300 font-medium">{{ r.filename }}</span> will be attached automatically.</p>
            } @else {
              <p class="text-xs text-slate-400 mt-3">Attach a resume, deck, or any file — sent with every email in this campaign.</p>
            }
          }
        </div>

        <!-- Sending config -->
        <div class="card p-5">
          <div class="flex items-center gap-2 mb-4">
            <lucide-icon [img]="LayersIcon" [size]="18" class="text-brand-500" />
            <h2 class="font-semibold text-slate-900 dark:text-white">Sending Configuration</h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Delay Between Emails</label>
              <select class="input" [(ngModel)]="delay">
                @for (d of delayOptions; track d.value) { <option [value]="d.value">{{ d.label }}</option> }
              </select>
            </div>
            <div>
              <label class="label">Maximum Emails Per Day</label>
              <input type="number" class="input" [(ngModel)]="maxPerDay" min="1" />
            </div>
          </div>
          <div class="flex items-center justify-between mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
            <div>
              <p class="text-sm font-medium text-slate-700 dark:text-slate-200">Pause Between Batches</p>
              <p class="text-xs text-slate-400">Adds a cooldown after every 50 emails.</p>
            </div>
            <button class="relative h-6 w-11 rounded-full transition-colors shrink-0"
                    [class]="pauseBatches() ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'"
                    (click)="pauseBatches.set(!pauseBatches())">
              <span class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" [class]="pauseBatches() ? 'left-[22px]' : 'left-0.5'"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- ============ RIGHT: LIVE PREVIEW ============ -->
      <div class="xl:col-span-2">
        <div class="card overflow-hidden xl:sticky xl:top-24">
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <lucide-icon [img]="EyeIcon" [size]="16" class="text-brand-500" />
              <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Live Preview</h2>
            </div>
            <span class="badge-neutral">{{ hasRealPreview() ? 'First recipient' : 'Sample data' }}</span>
          </div>
          <!-- mail header -->
          <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
            <div class="flex items-center gap-3">
              <div class="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">{{ profile.initials() || '—' }}</div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-slate-900 dark:text-white">{{ profile.name() || 'Your name' }}</p>
                <p class="text-xs text-slate-400 truncate">to {{ previewRecipient().email }}</p>
              </div>
            </div>
            <p class="text-sm font-semibold text-slate-900 dark:text-white pt-1">{{ renderedSubject() || 'No subject' }}</p>
          </div>
          <!-- body -->
          <div class="px-5 py-4 min-h-[240px] text-sm text-slate-700 dark:text-slate-200 leading-relaxed prose-editor"
               [innerHTML]="renderedBody()"></div>
          @if (defaultResume(); as r) {
            <div class="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300">
                <lucide-icon [img]="FileIcon" [size]="13" class="text-red-500" /> {{ r.filename }}
              </span>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Sticky send bar -->
    <div class="sticky bottom-0 mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3.5
                bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-20">
      @if (realDelivery() === false) {
        <div class="mx-auto max-w-7xl mb-2.5 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <lucide-icon [img]="Clock" [size]="14" />
          <span>You haven’t connected a sending email yet — <a routerLink="/settings" class="font-medium underline">connect it in Settings</a> to deliver to real inboxes.</span>
        </div>
      }
      @if (lastPreview(); as url) {
        <div class="mx-auto max-w-7xl mb-2.5 flex items-center gap-2 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 px-3 py-2 text-xs text-brand-700 dark:text-brand-400">
          <lucide-icon [img]="EyeIcon" [size]="14" />
          <span>Test email sent —</span>
          <a [href]="url" target="_blank" rel="noopener" class="font-medium underline">view preview</a>
        </div>
      }
      <div class="mx-auto max-w-7xl flex items-center justify-between gap-4">
        <p class="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
          Ready to send to <span class="font-semibold text-slate-900 dark:text-white">{{ recipientCount() }}</span> recipients
        </p>
        <div class="flex items-center gap-2 ml-auto">
          <button class="btn-secondary" (click)="saveCampaign()"><lucide-icon [img]="SaveIcon" [size]="16" /> <span class="hidden sm:inline">Save as Campaign</span></button>
          <button class="btn-primary" (click)="startSend()"><lucide-icon [img]="SendIcon" [size]="16" /> {{ campaignName() ? 'Send / Resume' : 'Send Campaign' }}</button>
        </div>
      </div>
    </div>

    <!-- Contact picker modal -->
    @if (showContacts()) {
      <div class="fixed inset-0 z-[85] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" (click)="showContacts.set(false)"></div>
        <div class="card relative w-full max-w-lg p-0 overflow-hidden animate-scale-in flex flex-col max-h-[80vh]">
          <div class="flex items-center justify-between px-5 h-14 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h3 class="font-semibold text-slate-900 dark:text-white">Add from Contacts</h3>
            <button class="btn-icon" (click)="showContacts.set(false)"><lucide-icon [img]="XIcon" [size]="18" /></button>
          </div>
          <div class="px-4 pt-4 pb-2 shrink-0 flex gap-2">
            <input class="input flex-1" placeholder="Search contacts…" [ngModel]="contactQuery()" (ngModelChange)="contactQuery.set($event)" />
            @if (contactGroups().length) {
              <select class="input w-auto shrink-0 max-w-[45%]" [ngModel]="contactGroup()" (ngModelChange)="contactGroup.set($event)" title="Filter by group">
                <option value="all">All groups</option>
                @for (g of contactGroups(); track g) { <option [value]="g">{{ g }}</option> }
              </select>
            }
          </div>
          <div class="px-4 pb-3 flex flex-wrap gap-1.5 shrink-0">
            @for (f of contactFilters; track f.key) {
              <button class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                      [class]="contactFilter() === f.key ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300' : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                      (click)="contactFilter.set(f.key)">{{ f.label }} <span class="tabular-nums opacity-60">{{ contactCount(f.key) }}</span></button>
            }
          </div>
          @if (filteredContacts().length === 0) {
            <div class="px-5 py-10 text-center text-sm text-slate-400">
              @if (data.contacts().length) {
                No contacts match this filter.
              } @else {
                No contacts yet. Import them in the <a routerLink="/contacts" (click)="showContacts.set(false)" class="text-brand-600 dark:text-brand-400 underline">Contacts</a> page.
              }
            </div>
          } @else {
            <div class="px-4 pb-2 flex items-center justify-between shrink-0">
              <button class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline" (click)="toggleAllContacts()">Select all ({{ filteredContacts().length }})</button>
              <span class="text-xs text-slate-400">{{ selectedContacts().size }} selected</span>
            </div>
            <div class="flex-1 overflow-y-auto px-2 pb-2">
              @for (c of filteredContacts(); track c.id) {
                <button class="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left" (click)="toggleContact(c.email)">
                  <span class="h-5 w-5 rounded-md border flex items-center justify-center shrink-0"
                        [class]="selectedContacts().has(c.email) ? 'bg-brand-600 border-brand-600' : 'border-slate-300 dark:border-slate-600'">
                    @if (selectedContacts().has(c.email)) { <lucide-icon [img]="CheckIcon" [size]="13" class="text-white" /> }
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{{ c.name || c.email }}</p>
                    <p class="text-xs text-slate-400 truncate">{{ c.email }}{{ c.company ? ' · ' + c.company : '' }}</p>
                  </div>
                  @if (contactStatus(c.email) === 'sent') {
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-success-500/15 text-success-600 dark:text-success-400">Sent</span>
                  } @else if (contactStatus(c.email) === 'failed') {
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-red-500/15 text-red-500">Failed</span>
                  } @else {
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-slate-500/12 text-slate-400">New</span>
                  }
                </button>
              }
            </div>
          }
          <div class="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button class="btn-secondary" (click)="showContacts.set(false)">Cancel</button>
            <button class="btn-primary" (click)="addSelectedContacts()" [disabled]="selectedContacts().size === 0">Add {{ selectedContacts().size || '' }}</button>
          </div>
        </div>
      </div>
    }

    <app-send-progress-modal [state]="progress()" (pause)="pauseSend()" (resume)="resumeSend()" (cancel)="cancelSend()" (close)="closeModal()" />
  `,
  styles: [`
    .ai-glow {
      background: linear-gradient(120deg, #38bdf8, #0ea5e9 55%, #0284c7);
      background-size: 180% 180%;
      box-shadow: 0 8px 24px -6px rgba(14,165,233, .55), 0 0 0 1px rgba(14,165,233, .25) inset;
      animation: aiShift 5s ease infinite, aiPulse 2.6s ease-in-out infinite;
      transition: transform .15s ease;
    }
    .ai-glow:hover { transform: translateY(-1px); }
    @keyframes aiShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
    @keyframes aiPulse { 0%,100% { box-shadow: 0 8px 24px -6px rgba(14,165,233,.45), 0 0 0 1px rgba(14,165,233,.25) inset; } 50% { box-shadow: 0 10px 34px -6px rgba(14,165,233,.85), 0 0 0 1px rgba(2,132,199,.4) inset; } }
    @media (prefers-reduced-motion: reduce) { .ai-glow { animation: none; } }
  `],
})
export class Compose implements OnInit {
  @ViewChild('editor') editorRef!: ElementRef<HTMLDivElement>;
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  data = inject(DataService);
  profile = inject(ProfileService);
  private send = inject(SendService);

  // Campaign context (when composing/resuming a saved campaign)
  campaignId = signal<string | null>(null);
  campaignName = signal('');

  // Contact picker
  showContacts = signal(false);
  contactQuery = signal('');
  selectedContacts = signal<Set<string>>(new Set());
  contactFilter = signal<'all' | 'notSent' | 'sent' | 'failed'>('all');
  contactGroup = signal('all');
  sentSet = signal<Set<string>>(new Set());
  failedSet = signal<Set<string>>(new Set());

  // Distinct groups across all contacts, for the picker's group dropdown.
  contactGroups = computed(() => {
    const seen = new Set<string>();
    for (const c of this.data.contacts()) for (const g of c.groups) if (g) seen.add(g);
    return [...seen].sort((a, b) => a.localeCompare(b));
  });
  readonly contactFilters = [
    { key: 'all' as const, label: 'All' },
    { key: 'notSent' as const, label: 'Not sent' },
    { key: 'sent' as const, label: 'Sent' },
    { key: 'failed' as const, label: 'Failed' },
  ];

  contactStatus(email: string): 'sent' | 'failed' | 'notSent' {
    const e = (email || '').toLowerCase();
    if (this.failedSet().has(e)) return 'failed';
    if (this.sentSet().has(e)) return 'sent';
    return 'notSent';
  }
  contactCount(key: 'all' | 'notSent' | 'sent' | 'failed') {
    if (key === 'all') return this.data.contacts().length;
    return this.data.contacts().filter((c) => this.contactStatus(c.email) === key).length;
  }

  filteredContacts = computed(() => {
    const q = this.contactQuery().toLowerCase();
    const f = this.contactFilter();
    const g = this.contactGroup();
    return this.data.contacts().filter((c) =>
      (f === 'all' || this.contactStatus(c.email) === f) &&
      (g === 'all' || c.groups.includes(g)) &&
      (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)));
  });

  subject = 'Opportunities at {{company}}';
  variables = ['firstName', 'lastName', 'company', 'position'];
  sample = { firstName: 'John', lastName: 'Carter', company: 'Acme', position: 'Engineering Manager', email: 'john@acme.com' };

  // Preview against the first real recipient when there is one (falls back to sample per field).
  hasRealPreview = computed(() => this.buildRecipients().length > 0);
  previewRecipient = computed(() => {
    const r = this.buildRecipients()[0];
    if (!r) return this.sample;
    return {
      firstName: r.firstName || this.sample.firstName,
      lastName: r.lastName || this.sample.lastName,
      company: r.company || this.sample.company,
      position: r.position || this.sample.position,
      email: r.email || this.sample.email,
    };
  });

  private defaultBody =
    'Hi {{firstName}},<div><br></div><div>I hope you’re doing well.</div><div><br></div>' +
    '<div>I came across your profile and wanted to connect regarding opportunities at {{company}}.</div>' +
    '<div><br></div><div>Best,<br>Pratik</div>';

  bodyHtml = signal(this.defaultBody);
  subjectSig = signal(this.subject);

  recipientTab = signal<'paste' | 'csv'>('paste');
  rawEmails = '';
  emailChips = signal<string[]>([]);
  csvRows = signal<CsvRow[]>([]);

  // The default resume (uploaded in Settings) is attached automatically on send when
  // no explicit attachments are added here.
  defaultResume = signal<Resume | null>(null);

  // Ad-hoc attachments uploaded from this screen — sent with every email.
  attachments = signal<{ id: string; filename: string; size: number; mimeType: string }[]>([]);
  uploadingAttach = signal(false);

  // AI writer
  aiOpen = signal(false);
  aiPrompt = '';
  aiTone = 'professional';
  aiBusy = signal<'' | 'generate' | 'improve'>('');

  hasDraft() { return !!(this.bodyHtml() || '').replace(/<[^>]*>/g, '').trim(); }
  aiModelLabel() { return this.profile.aiUseCustom() ? (this.profile.aiCustomModel() || 'Custom') : 'Qwen3 · free'; }
  aiPlaceholder() {
    return this.hasDraft()
      ? "Describe a new email — or add an instruction (e.g. 'make it shorter') and click Improve current."
      : "Describe the email — e.g. 'intro to a SaaS founder about our analytics tool, ask for a 15-min call'";
  }

  delay = '10';
  delayOptions = [
    { value: '0', label: 'No Delay' }, { value: '5', label: '5 seconds' },
    { value: '10', label: '10 seconds' }, { value: '20', label: '20 seconds' },
    { value: '30', label: '30 seconds' }, { value: '60', label: '1 minute' },
  ];
  maxPerDay = 250;
  pauseBatches = signal(true);

  progress = signal<SendProgress | null>(null);
  realDelivery = signal(true);
  queueAvailable = signal(false);
  sendMode = signal<string | null>(null);
  lastPreview = signal<string | null>(null);

  recipientCount = computed(() =>
    this.recipientTab() === 'csv' ? this.csvRows().length : this.emailChips().length
  );

  renderedSubject = computed(() => this.substitute(this.subjectSig()));
  renderedBody = computed(() => this.substitute(this.bodyHtml()));

  constructor() {
    this.parseEmails();
    this.api.getSendStatus().subscribe({
      next: (s) => { this.realDelivery.set(s.realDelivery); this.sendMode.set(s.mode); this.queueAvailable.set(!!s.queue); },
      error: () => {},
    });
    // Load the default resume so we can show it will be attached.
    this.api.listResumes().subscribe({
      next: (list) => this.defaultResume.set(list[0] ?? null),
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('campaign');
    if (id) this.loadCampaign(id);
    const tpl = this.route.snapshot.queryParamMap.get('template');
    if (tpl) this.loadTemplate(tpl);
  }

  // In-editor template picker (dropdown above the Subject field).
  templatePick = signal('');
  useTemplate(id: string) {
    if (!id) return;
    this.loadTemplate(id);
    this.templatePick.set(''); // reset the dropdown back to its placeholder
  }

  // In-editor "reuse a sent email" picker — deduped by subject, most recent first.
  historyPick = signal('');
  historyOptions = computed(() => {
    const seen = new Set<string>();
    const out: { id: string; subject: string; recipient: string }[] = [];
    for (const e of this.data.history()) {
      const key = (e.subject || '(no subject)').toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id: e.id, subject: e.subject, recipient: e.recipient });
      if (out.length >= 25) break;
    }
    return out;
  });
  useHistory(id: string) {
    if (!id) return;
    this.historyPick.set('');
    this.api.getEmail(id).subscribe({
      next: (e) => {
        if (e.subject) { this.subject = e.subject; this.subjectSig.set(e.subject); }
        // Stored bodies are HTML; fall back to line-break conversion for plain text.
        const html = /<[a-z][\s\S]*>/i.test(e.html || '') ? (e.html || '') : (e.html || '').replace(/\n/g, '<br>');
        this.applyBody(html);
        this.toast.success('Loaded from history', e.subject || '');
      },
      error: (err) => this.toast.error('Could not load email', err?.error?.message || 'Try again.'),
    });
  }

  // Apply a saved template's subject + body into the composer.
  private loadTemplate(id: string) {
    const apply = (t?: { name?: string; subject?: string; body?: string }) => {
      if (!t) { this.toast.error('Template not found'); return; }
      if (t.subject) { this.subject = t.subject; this.subjectSig.set(t.subject); }
      // Template bodies are stored as plain text — turn line breaks into HTML for the editor.
      const html = /<[a-z][\s\S]*>/i.test(t.body || '') ? (t.body || '') : (t.body || '').replace(/\n/g, '<br>');
      this.applyBody(html);
      this.toast.success('Template applied', t.name || '');
    };
    const found = this.data.templates().find((t) => t.id === id);
    if (found) apply(found);
    else this.api.listTemplates().subscribe((list) => apply(list.find((t) => t.id === id)));
  }

  ngAfterViewInit() {
    // Body may already be set from a loaded campaign; otherwise use the default.
    this.editorRef.nativeElement.innerHTML = this.bodyHtml();
  }

  private loadCampaign(id: string) {
    this.api.getCampaignPending(id).subscribe({
      next: ({ campaign, pending }) => {
        this.campaignId.set(id);
        this.campaignName.set(campaign.name || 'Campaign');
        this.subject = campaign.subject || '';
        this.subjectSig.set(this.subject);
        this.bodyHtml.set(campaign.body || '');
        if (this.editorRef?.nativeElement) this.editorRef.nativeElement.innerHTML = campaign.body || '';
        this.csvRows.set(pending.map((p) => ({ name: p.name, company: p.company, email: p.email, position: p.position })));
        this.recipientTab.set('csv');
        if (pending.length === 0) this.toast.success('Campaign complete', 'All recipients have already been sent.');
        else this.toast.info(`Resuming “${campaign.name}”`, `${pending.length} recipient${pending.length > 1 ? 's' : ''} remaining.`);
      },
      error: () => this.toast.error('Could not load campaign'),
    });
  }

  // ---- contact picker ----
  openContacts() {
    this.selectedContacts.set(new Set());
    this.contactFilter.set('all');
    this.contactGroup.set('all');
    this.showContacts.set(true);
    this.api.recipientStatuses().subscribe({
      next: (r) => {
        this.sentSet.set(new Set(r.sent.map((e) => e.toLowerCase())));
        this.failedSet.set(new Set(r.failed.map((e) => e.toLowerCase())));
      },
      error: () => {},
    });
  }
  toggleContact(email: string) {
    const s = new Set(this.selectedContacts());
    s.has(email) ? s.delete(email) : s.add(email);
    this.selectedContacts.set(s);
  }
  toggleAllContacts() {
    const all = this.filteredContacts();
    const s = new Set(this.selectedContacts());
    const everySelected = all.length > 0 && all.every((c) => s.has(c.email));
    all.forEach((c) => (everySelected ? s.delete(c.email) : s.add(c.email)));
    this.selectedContacts.set(s);
  }
  addSelectedContacts() {
    const chosen = this.data.contacts().filter((c) => this.selectedContacts().has(c.email));
    if (!chosen.length) { this.toast.error('No contacts selected'); return; }
    const map = new Map(this.csvRows().map((r) => [r.email, r] as const));
    chosen.forEach((c) => map.set(c.email, { name: c.name, company: c.company, email: c.email, position: c.position }));
    this.csvRows.set([...map.values()]);
    this.recipientTab.set('csv');
    this.showContacts.set(false);
    this.toast.success('Contacts added', `${chosen.length} added to recipients.`);
  }

  // ---- save as campaign ----
  saveCampaign() {
    const recipients = this.buildRecipients().map((r) => ({ email: r.email, name: r.name, company: r.company, position: r.position }));
    if (!recipients.length) { this.toast.error('Add recipients first', 'Paste emails, upload a CSV, or add from Contacts.'); return; }
    const name = (prompt('Name this campaign:', this.campaignName() || 'New Campaign') || '').trim();
    if (!name) return;
    this.api.createCampaign({ name, subject: this.subjectSig(), body: this.bodyHtml(), status: 'draft', recipients }).subscribe({
      next: (c: any) => {
        this.campaignId.set(c.id || c._id);
        this.campaignName.set(name);
        this.data.refreshCampaigns();
        this.toast.success('Campaign saved', `“${name}” saved with ${recipients.length} recipients.`);
      },
      error: (e) => this.toast.error('Save failed', e?.error?.message || 'Could not save campaign.'),
    });
  }

  // ---- editor ----
  format(cmd: string) {
    this.editorRef?.nativeElement.focus();
    document.execCommand(cmd, false);
    this.onEditorInput();
  }
  addLink() {
    const url = prompt('Enter URL', 'https://');
    if (url) { this.editorRef.nativeElement.focus(); document.execCommand('createLink', false, url); this.onEditorInput(); }
  }
  insertVariable(v: string) {
    this.editorRef?.nativeElement.focus();
    document.execCommand('insertText', false, `{{${v}}}`);
    this.onEditorInput();
  }
  onEditorInput() {
    this.bodyHtml.set(this.editorRef.nativeElement.innerHTML);
  }
  substitute(text: string): string {
    const r = this.previewRecipient();
    return text
      .replace(/\{\{firstName\}\}/g, r.firstName)
      .replace(/\{\{lastName\}\}/g, r.lastName)
      .replace(/\{\{company\}\}/g, r.company)
      .replace(/\{\{position\}\}/g, r.position);
  }

  // ---- recipients ----
  parseEmails() {
    this.subjectSig.set(this.subject);
    const found = (this.rawEmails.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []);
    this.emailChips.set(Array.from(new Set(found)));
  }
  removeEmail(e: string) { this.emailChips.update((l) => l.filter((x) => x !== e)); }
  clearEmails() { this.rawEmails = ''; this.emailChips.set([]); }

  onCsvSelect(evt: Event) {
    const file = (evt.target as HTMLInputElement).files?.[0];
    if (file) this.readCsv(file);
  }
  onCsvDrop(evt: DragEvent) {
    evt.preventDefault();
    const file = evt.dataTransfer?.files?.[0];
    if (file) this.readCsv(file);
  }
  private readCsv(file: File) {
    if (/\.xlsx?$/i.test(file.name)) {
      this.toast.error('Export as CSV first', 'In Google Sheets/Excel: File → Download → CSV, then upload that file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseContactsCsv(String(reader.result));
      if (rows.length === 0) {
        this.toast.error('No emails found', 'Make sure the file has an Email column.');
        return;
      }
      this.csvRows.set(rows);
      this.toast.success('CSV imported', `${rows.length} recipients loaded.`);
    };
    reader.readAsText(file);
  }

  // ---- attachments ----
  onAttachSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) return;
    this.uploadingAttach.set(true);
    this.api.uploadAttachments(files).subscribe({
      next: (saved) => {
        this.uploadingAttach.set(false);
        this.attachments.update((list) => [...list, ...saved]);
        this.toast.success('Attached', `${saved.length} file${saved.length === 1 ? '' : 's'} added.`);
      },
      error: (e) => { this.uploadingAttach.set(false); this.toast.error('Upload failed', e?.error?.message || 'Could not upload files.'); },
    });
  }

  removeAttachment(id: string) {
    this.attachments.update((list) => list.filter((a) => a.id !== id));
    this.api.deleteAttachment(id).subscribe({ error: () => {} });
  }

  fmtSize(bytes: number) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  // ---- AI writer ----
  private applyBody(html: string) {
    this.bodyHtml.set(html);
    if (this.editorRef?.nativeElement) this.editorRef.nativeElement.innerHTML = html;
  }

  generateAi() {
    const prompt = this.aiPrompt.trim();
    if (!prompt) return;
    this.aiBusy.set('generate');
    this.api.aiGenerate({ kind: 'email', prompt, tone: this.aiTone }).subscribe({
      next: (r) => {
        this.aiBusy.set('');
        if (r.subject) { this.subject = r.subject; this.subjectSig.set(r.subject); }
        if (r.body) this.applyBody(r.body);
        this.aiOpen.set(false);
        this.toast.success('Draft ready ✨', 'Review and tweak before sending.');
      },
      error: (e) => { this.aiBusy.set(''); this.toast.error('AI couldn’t write that', e?.error?.message || 'Try again.'); },
    });
  }

  // Rewrite the current draft (optionally guided by an instruction typed in the box).
  improveAi() {
    const current = (this.editorRef?.nativeElement?.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
    if (!current) { this.toast.info('Nothing to improve', 'Write a draft first, or use Generate.'); return; }
    const instruction = this.aiPrompt.trim();
    const prompt = (instruction ? `Instruction: ${instruction}\n\n` : '') + `Current email:\n${current}`;
    this.aiBusy.set('improve');
    this.api.aiGenerate({ kind: 'improve', prompt, tone: this.aiTone }).subscribe({
      next: (r) => {
        this.aiBusy.set('');
        if (r.body) this.applyBody(r.body);
        this.aiOpen.set(false);
        this.toast.success('Improved ✨', 'Your draft was rewritten.');
      },
      error: (e) => { this.aiBusy.set(''); this.toast.error('AI couldn’t improve that', e?.error?.message || 'Try again.'); },
    });
  }

  // ---- send flow (real delivery via /api/send) ----
  private cancelled = false;

  private buildRecipients() {
    if (this.recipientTab() === 'csv') {
      return this.csvRows().map((r) => {
        const parts = (r.name || '').trim().split(/\s+/);
        return { email: r.email, name: r.name || '', firstName: parts[0] || '', lastName: parts.slice(1).join(' '), company: r.company || '', position: r.position || '' };
      });
    }
    return this.emailChips().map((e) => ({ email: e, name: '', firstName: e.split('@')[0], lastName: '', company: '', position: '' }));
  }

  private substituteFor(text: string, r: { firstName: string; lastName: string; company: string; position: string }): string {
    return text
      .replace(/\{\{firstName\}\}/g, r.firstName)
      .replace(/\{\{lastName\}\}/g, r.lastName)
      .replace(/\{\{company\}\}/g, r.company)
      .replace(/\{\{position\}\}/g, r.position);
  }

  private sleep(ms: number) { return new Promise<void>((res) => setTimeout(res, ms)); }
  private async waitWhilePaused() {
    while (this.progress()?.paused && !this.cancelled) await this.sleep(200);
  }

  async startSend() {
    const recipients = this.buildRecipients();
    if (recipients.length === 0) { this.toast.error('No recipients', 'Add at least one email address.'); return; }

    const ok = await this.confirm.ask({
      title: 'Send campaign?',
      message: this.realDelivery()
        ? `This will send ${recipients.length} personalized email${recipients.length > 1 ? 's' : ''}.`
        : `Test mode: ${recipients.length} email${recipients.length > 1 ? 's' : ''} will be generated with preview links (not delivered to real inboxes).`,
      confirmText: 'Send now',
    });
    if (!ok) return;

    const delaySec = parseInt(this.delay, 10) || 0;

    // Larger campaigns run on the server queue (BullMQ) so the send survives navigation.
    if (recipients.length > 2 && this.queueAvailable()) {
      try {
        await this.send.startBulk({
          subject: this.subjectSig(),
          html: this.bodyHtml(),
          campaign: this.campaignName() || 'Compose',
          campaignId: this.campaignId() || undefined,
          attachmentIds: this.attachments().length ? this.attachments().map((a) => a.id) : undefined,
          delaySeconds: delaySec,
          recipients,
        });
        this.toast.success('Campaign queued', `Sending ${recipients.length} emails in the background — you can keep working.`);
        if (this.campaignId()) this.data.refreshCampaigns();
      } catch (e: any) {
        this.toast.error('Could not queue', e?.error?.message || 'Try again.');
      }
      return;
    }

    // Small sends (≤2) run inline with the on-page progress modal.
    this.cancelled = false;
    this.lastPreview.set(null);
    this.progress.set({ total: recipients.length, sent: 0, failed: 0, current: '', paused: false, done: false, etaSeconds: recipients.length * (delaySec + 1) });

    for (let i = 0; i < recipients.length; i++) {
      await this.waitWhilePaused();
      if (this.cancelled) return;

      const r = recipients[i];
      const subject = this.substituteFor(this.subjectSig(), r) || '(no subject)';
      const html = this.substituteFor(this.bodyHtml(), r);
      this.progress.update((p) => (p ? { ...p, current: r.email } : p));

      let failed = false;
      try {
        const res = await firstValueFrom(this.api.sendEmail({ to: r.email, name: r.name, subject, html, campaign: this.campaignName() || 'Compose', campaignId: this.campaignId() || undefined, attachmentIds: this.attachments().length ? this.attachments().map((a) => a.id) : undefined }));
        failed = res.status !== 'delivered';
        if (res.previewUrl) this.lastPreview.set(res.previewUrl);
      } catch {
        failed = true;
      }

      const remaining = recipients.length - i - 1;
      this.progress.update((p) => (p ? {
        ...p,
        sent: p.sent + (failed ? 0 : 1),
        failed: p.failed + (failed ? 1 : 0),
        etaSeconds: Math.max(0, remaining * (delaySec + 1)),
      } : p));

      if (remaining > 0 && delaySec > 0) {
        let waited = 0;
        while (waited < delaySec * 1000) {
          if (this.cancelled) return;
          await this.waitWhilePaused();
          await this.sleep(200);
          waited += 200;
        }
      }
    }

    const p = this.progress();
    this.progress.update((cur) => (cur ? { ...cur, done: true, current: '' } : cur));
    if (p) this.toast.success('Campaign sent', `${p.sent} delivered, ${p.failed} failed.`);
    if (this.campaignId()) this.data.refreshCampaigns();
  }

  pauseSend() { const p = this.progress(); if (p) this.progress.set({ ...p, paused: true }); }
  resumeSend() { const p = this.progress(); if (p) this.progress.set({ ...p, paused: false }); }
  async cancelSend() {
    const ok = await this.confirm.ask({ title: 'Cancel sending?', message: 'Remaining emails will not be sent.', confirmText: 'Stop campaign', danger: true });
    if (!ok) return;
    this.cancelled = true;
    this.progress.set(null);
    this.toast.warning('Campaign cancelled');
  }
  closeModal() { this.cancelled = true; this.progress.set(null); }


  // icons
  readonly BoldIcon = Bold; readonly ItalicIcon = Italic; readonly UnderlineIcon = Underline;
  readonly ListIcon = List; readonly LinkIcon = Link2; readonly SendIcon = Send; readonly SaveIcon = Save;
  readonly UsersIcon = Users; readonly UploadIcon = Upload; readonly XIcon = X; readonly FileIcon = FileText;
  readonly Clip = Paperclip; readonly Clock = Clock; readonly LayersIcon = Layers; readonly EyeIcon = Eye; readonly Spinner = Loader2; readonly Spark = Sparkles; readonly RefreshIcon = RefreshCw;
  readonly BracesIcon = Braces; readonly UserPlusIcon = UserPlus; readonly MegaphoneIcon = Megaphone; readonly CheckIcon = Check;
}
