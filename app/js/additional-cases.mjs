import { addDays } from './date-utils.mjs';
export const ADDITIONAL_CASES = [
  {
    n: 5,
    age: 76,
    diagnosis: 'Atrial fibrillation',
    target: [2, 3],
    inrs: [2.4, 1.7, 3.8, 2.6, 4.9, 2.1, 3.3, 4.0],
    daily: [5, 5, 5, 5, 5, 5, 5],
    nextOffset: 1,
    stock: 20,
    historyOffsets: [-196, -168, -140, -112, -84, -56, -28, 0],
    regimenOffset: -28,
    warfarinStartOffset: -365,
    riskLevel: 'high',
    riskCategory: 'bleeding',
    riskReason:
      'Synthetic case: previous gastrointestinal bleeding and variable INR; clinician review required.',
  },
  {
    n: 6,
    age: 58,
    diagnosis: 'Mechanical mitral valve',
    target: [2.5, 3.5],
    inrs: [2.9, 3.8, 2.1, 3.5, 4.3, 2.8, 2.0, 1.6],
    daily: [5, 7.5, 5, 7.5, 5, 7.5, 5],
    nextOffset: 1,
    stock: 6,
    historyOffsets: [-196, -168, -140, -112, -84, -56, -28, 0],
    regimenOffset: -28,
    warfarinStartOffset: -365,
    riskLevel: 'high',
    riskCategory: 'thrombosis',
    riskReason:
      'Synthetic case: mechanical mitral valve with a subtherapeutic INR; prompt clinician assessment.',
  },
  {
    n: 7,
    age: 72,
    diagnosis: 'Recurrent venous thromboembolism',
    target: [2, 3],
    inrs: [2.3, 2.8, 1.4, 3.4, 2.0, 4.5, 3.1, 6.2],
    daily: [2.5, 5, 2.5, 5, 2.5, 5, 2.5],
    nextOffset: 1,
    stock: 18,
    historyOffsets: [-196, -168, -140, -112, -84, -56, -28, 0],
    regimenOffset: -28,
    warfarinStartOffset: -365,
    riskLevel: 'high',
    riskCategory: 'both',
    riskReason:
      'Synthetic case: recurrent thrombosis history, labile INR and a recent interacting-medicine concern.',
  },
];
export function additionalPatients(today) {
  return ADDITIONAL_CASES.map((c) => {
    const id = 'CASE-' + c.n,
      mrn = 'DEMO-' + String(c.n).padStart(3, '0'),
      testDate = addDays(today, c.historyOffsets.at(-1)),
      next = addDays(today, c.nextOffset),
      note =
        'Fictional extended-history sample for development. Historical results are synthetic, not clinician-approved treatment.';
    return {
      mrn,
      name: 'Sample Patient ' + String.fromCharCode(64 + c.n),
      dob: Number(today.slice(0, 4)) - c.age + '-01-15',
      diagnosis: c.diagnosis,
      phone: '050000000' + c.n,
      caregiver: 'Demo caregiver',
      caregiverPhone: '050111000' + c.n,
      targetLow: c.target[0],
      targetHigh: c.target[1],
      enrollmentDate: addDays(today, -75),
      enrollmentInr: c.inrs[0],
      warfarinStartDate: addDays(today, c.warfarinStartOffset),
      status: 'Active',
      riskLevel: c.riskLevel,
      riskCategory: c.riskCategory,
      riskReason: c.riskReason,
      riskReviewDate: today,
      riskUpdatedBy: 'Unverified demo staff',
      riskUpdatedAt: today,
      results: c.inrs.map((value, i) => ({
        id: id + '-R' + i,
        date: addDays(today, c.historyOffsets[i]),
        value,
        targetLow: c.target[0],
        targetHigh: c.target[1],
        enteredBy: 'Synthetic historical fixture',
      })),
      dosePlans: [
        {
          id: id + '-D',
          encounterId: id + '-E',
          date: addDays(today, c.regimenOffset),
          daily: [...c.daily],
          inr: c.inrs.at(-1),
          nextInrDate: next,
          reason: note,
          enteredBy: 'Unverified demo staff',
          approvedBy: null,
          approvedAt: null,
        },
      ],
      encounters: [
        { id: id + '-E', date: testDate, inr: c.inrs.at(-1), note, enteredBy: 'Unverified demo staff' },
      ],
      notes: [
        {
          id: id + '-N',
          date: testDate,
          text:
            c.riskReason +
            ' Fictional assessment prompt: confirm adherence, interacting medicines and symptoms; document the clinician’s action separately.',
          by: 'Synthetic fixture — no clinical approval',
        },
      ],
      inventory: [{ strength: 5, quantity: c.stock, date: today }],
      followups: [{ id: id + '-F', inrDate: next, callDate: addDays(next, 2), status: 'Pending' }],
    };
  });
}
export function mergeAdditionalPatients(existing, today) {
  const mrns = new Set(existing.map((p) => String(p.mrn).toUpperCase()));
  return [...existing, ...additionalPatients(today).filter((p) => !mrns.has(p.mrn))];
}
