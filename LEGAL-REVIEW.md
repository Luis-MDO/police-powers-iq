# Legal-feedback review and maintenance

Reviewed October 20, 2026. This records a proposition-level check against primary sources, not a guarantee about every hypothetical application or later legal developments. Justice Canada Criminal Code pages reported a consolidation current to September 30, 2026, last amended July 18, 2026.

## Data and display contract

- `questions.js` owns IDs, question text, options, original answer indices and chapter grouping. Historical slide metadata remains internal and is never rendered as authority.
- `question-feedback.json` owns the displayed explanation, source IDs, pinpoint and question-specific review state. Original uploaded review states are retained as `packageReviewStatus` for provenance.
- `legal-authorities.json` owns source titles, HTTPS URLs and source-identity verification. This is distinct from whether a source supports a particular question.
- `legal-feedback.js` validates lookups and original-order answer keys and renders both feedback surfaces. It never controls grading, pool selection or storage.
- `verified`: primary support for the narrow question/explanation was checked. All linked source records must also be verified before the explanation is displayed.
- `study_aid`: a reviewed mnemonic is labelled as such; it is not represented as statutory wording.
- `needs_review`, unknown statuses, missing records, mismatched answer keys, unsafe URLs and failed asset loads: do not display substantive legal explanations. Show a pending state and the existing recorded answer key. Related links are explicitly labelled as pending support.

Current totals: **210 verified, 13 study aids, 7 pending**. A `mapped_authority` status from the initial handoff is never sufficient for substantive display.

## Confirmed corrections

- `HYBRID` now references the Interpretation Act, s. 34, rather than the unrelated Criminal Code self-defence provision. Dudley supplies further Crown-election context.
- Q006/F006 cite Constitution Act, 1982, s. 52(1); Q038 cites s. 512(2); Q039 cites s. 511 with cancellation/deemed-execution qualifications.
- Q042 explains forthwith delivery under s. 494(3). Q036/Q060/Q061 distinguish detention from a separately justified protective search under Mann.
- Q061A's correct option expresses reasonable grounds to believe safety is at risk. Q086A's stem and correct option address the writing/non-writing distinction in current s. 487.1(5)–(6), rather than inability to appear in person.
- Caslake, Mann and M. (M.R.) link to direct judgments, not dockets. Feeney and Evans use accessible official decisions-site URLs.
- Caslake, Fearon, Godoy, Genest, Araujo, Morelli and other checked judgments supply context-specific common-law support instead of attributing those rules to unrelated Code provisions.
- All 95 generated True/False wrappers were replaced with direct assertions; their original True/False keys remain unchanged. Professor-specific wording was removed from the affected stems and displayed feedback. No question IDs, counts or answer-index arrays changed.

## Scantron format update

After the legal-feedback integration, the ten M001–M010 items were converted from multiple selections to one most-complete answer, using five lettered options. Five items use stable numbered statements and combinations; five use individual correct choices, a partial combination and “All of the above.” The latter stays last during shuffling. The instruction is “Select the most complete correct answer. Mark one choice.” No “only” qualifier is added to the converted choices.

This later format change updates the ten answer-index arrays and their matching feedback records to single indices. IDs, concepts, legal review states and browser-progress storage remain unchanged. Historical progress stores IDs rather than the previously selected option arrays, so no storage migration or reset is needed. At the format-conversion stage M003 and M007 remained pending; a format conversion does not verify legal support. M003 was subsequently revised and verified as described below; M007 remains pending.

## Follow-up review

The follow-up resolved 21 of the 28 previously pending items without changing IDs or answer indices:

- Q008A/B and F008: Salituro, [1991] 3 SCR 654, supports judicial development of common law. The source is used for that proposition, not for its historical spousal-evidence rule.
- Q027A/B and F027: replaced the unsourced Four Ps terminology with a question about protection of property as a common-law police duty, supported by Mann, para. 26. A duty is not automatically an intrusive power.
- Q037A/B: replaced an undefined classroom decision model with the role of offence classification in s. 495(2).
- Q066A/B: explanation distinguishes the general no-third-party-waiver rule in Reeves, paras. 39–52, from its application to a landlord/tenant situation. The judgment’s actual facts concern a shared computer; it is not misrepresented as a landlord case.
- Q081A/B: narrowed the question to a prior refusal material to the new application and applies the material-disclosure duty in Araujo, paras. 46–47, and Morelli, para. 44. This is an application of the general duty, not a purported quotation specifically listing all prior refusals.
- Q082A/B: Araujo, para. 46, and Côté, paras. 24 and 83, support disclosure of material facts about unconstitutional collection. The explanation does not require an officer to adjudicate every possible Charter issue.
- Q091A/B: identifies the distinction between premises authority and a person-search power, including the express conditions in CDSA s. 11(5) and the separate protective-search conditions in Mann. The CDSA provision is expressly identified as an example within that Act.
- Q093A/B: Form 5 expressly allows the justice to specify hours. The explanation and True/False statement focus on that verified timing point, with s. 488’s nighttime rules kept distinct.
- Q095A/B: Yumnu, 2012 SCC 73, para. 56, spells out the CPIC acronym. The supplied RCMP page remains unverified and is not used for these questions. The acronym does not confer a police power.
- M003: replaced the insufficiently sourced officer-identification statement with the actual right under Charter s. 10(c). The question now asks about the three rights in s. 10(a)–(c), not a universal set of arrest warnings. The single most-complete answer remains statements 1, 2 and 3.

## Pending question families

| Items | Remaining issue |
|---|---|
| Q065A/B | Pinpoint primary support for search-consent withdrawal, beyond general informed-consent principles. |
| Q070A/B, M007 | Chain-of-custody/evidence-handling support; seizure authority or continuity of criminal possession is not the same doctrine. |
| Q092A/B | Re-entry jurisprudence distinguishing completed searches from temporary interruptions. |

These seven items remain explicitly pending. Searches that returned medical or sexual consent, continuity of criminal possession, or tenancy re-entry were not used to support police search/evidence rules. They address different legal issues. These items are not excluded from random selection; doing so would change the pool and existing progress behavior.

## Reviewing future changes

Read the actual provision or judgment, check source identity and currency, and record the relevant paragraph/subsection. Do not treat an HTTP success, case name, docket or broad Charter citation as proof of the particular claim. Historical judgments may quote previous section numbers or procedural limits: use the current legislation for those details.

Update the relevant A/B/F variants together. Confirm the truth of each actual True/False assertion. Keep IDs stable; if a substantive answer changes, explicitly review how existing learning history should be interpreted instead of resetting browser progress automatically.

Only promote an item after its question, all answer choices, explanation and source support agree. Keep genuinely unresolved items pending. Run the integration suite after changing data or rendering code. Tests check technical integrity; passing tests do not establish legal accuracy.

The browser suite uses a local HTTP server and fresh browser storage. No Netlify deployment or publication was performed as part of this integration.
