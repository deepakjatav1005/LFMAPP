import React, { useState } from 'react';
import { Admin, Subscription, SubscriptionPlan, DeveloperProfile } from '../types';
import ViewHeader from './ViewHeader';
import { formatDateDDMMYYYY } from '../utils/printUtils';

interface UserSubscriptionViewProps {
  isHindi: boolean;
  loggedInAdmin: Admin | null;
  subscriptions?: Subscription[];
  currentSubscription?: Subscription;
  subscriptionPlans?: SubscriptionPlan[];
  developerProfile: DeveloperProfile;
  onRequestSubscription: (plan: SubscriptionPlan, notes?: string) => void;
}

export const UserSubscriptionView: React.FC<UserSubscriptionViewProps> = ({
  isHindi,
  loggedInAdmin,
  subscriptions = [],
  currentSubscription,
  subscriptionPlans = [],
  developerProfile,
  onRequestSubscription,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentTxn, setPaymentTxn] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Find user's active subscription object if exists
  const userSub = currentSubscription || (subscriptions || []).find(
    (s) => s.adminId === loggedInAdmin?.id || s.gramPanchayat === loggedInAdmin?.gramPanchayat
  );

  // Calculate Trial details (1 month free trial from registration date)
  const regDate = loggedInAdmin?.createdAt ? new Date(loggedInAdmin.createdAt) : new Date();
  const trialEndDate = new Date(regDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const now = new Date();
  const daysLeftInTrial = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 3600 * 24)));

  const isSubscribed = userSub?.status === 'SUBSCRIBED';
  const isTrialActive = !isSubscribed && daysLeftInTrial > 0;
  const isExpired = !isSubscribed && daysLeftInTrial <= 0;

  // Active plans created by developer
  const activePlans = subscriptionPlans.filter((p) => p.isActive);

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    onRequestSubscription(selectedPlan, paymentTxn);
    setRequestSuccess(true);
    setSelectedPlan(null);
    setPaymentTxn('');
    setTimeout(() => setRequestSuccess(false), 6000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <ViewHeader
        title={isHindi ? 'सदस्यता एवं सॉफ्टवेयर प्लान' : 'Subscriptions & App Plans'}
        subtitle={
          isHindi
            ? 'अपनी ग्राम पंचायत हेतु सदस्यता स्थिति देखें एवं नया प्लान एक्टिवेट करें'
            : 'Check subscription status and purchase active developer plans'
        }
        icon="👑"
      />

      {requestSuccess && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg border border-emerald-500 font-bold text-sm flex items-center justify-between animate-fade-in">
          <span>
            {isHindi
              ? '🎉 आपका सदस्यता अनुरोध डेवलपर (Chanchal Net Zone) को भेज दिया गया है! डेवलपर सत्यापन के पश्चात आपकी सदस्यता तुरंत सक्रिय कर दी जाएगी।'
              : '🎉 Subscription request sent to developer! It will be activated shortly after verification.'}
          </span>
          <button onClick={() => setRequestSuccess(false)} className="text-emerald-200 hover:text-white font-black text-xs">
            ✕
          </button>
        </div>
      )}

      {/* CURRENT STATUS BANNER */}
      <div
        className={`p-6 rounded-2xl shadow-md border space-y-3 ${
          isSubscribed
            ? 'bg-emerald-900 text-white border-emerald-700'
            : isTrialActive
            ? 'bg-amber-900 text-amber-50 border-amber-700'
            : 'bg-rose-950 text-rose-50 border-rose-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl">
                {isSubscribed ? '🌟' : isTrialActive ? '🎁' : '⚠️'}
              </span>
              <h3 className="text-lg font-black tracking-wide">
                {isSubscribed
                  ? isHindi
                    ? 'सक्रिय भुगतान सदस्यता (ACTIVE PAID SUBSCRIPTION)'
                    : 'ACTIVE PAID SUBSCRIPTION'
                  : isTrialActive
                  ? isHindi
                    ? '1-माह नि:शुल्क ट्रायल चालू (FREE 1-MONTH TRIAL)'
                    : '1-MONTH FREE TRIAL ACTIVE'
                  : isHindi
                  ? 'नि:शुल्क ट्रायल समाप्त (TRIAL EXPIRED - SUBSCRIPTION REQUIRED)'
                  : 'TRIAL EXPIRED - SUBSCRIPTION REQUIRED'}
              </h3>
            </div>
            <p className="text-xs opacity-90 font-medium">
              {isHindi ? 'ग्राम पंचायत:' : 'Gram Panchayat:'} <span className="font-bold underline">{loggedInAdmin?.gramPanchayat || ''}</span> • {isHindi ? 'अधिकारी:' : 'Officer:'} {loggedInAdmin?.name || ''} ({loggedInAdmin?.mobile || ''})
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/20 text-center min-w-[180px]">
            {isSubscribed ? (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                  {isHindi ? 'वैधता की अंतिम तिथि' : 'Plan Expiry Date'}
                </span>
                <span className="text-base font-black text-emerald-300">{formatDateDDMMYYYY(userSub?.endDate) || '01/08/2027'}</span>
              </div>
            ) : isTrialActive ? (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-200">
                  {isHindi ? 'शेष ट्रायल दिन' : 'Trial Days Left'}
                </span>
                <span className="text-xl font-black text-amber-300">{daysLeftInTrial} {isHindi ? 'दिन शेष' : 'Days'}</span>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-300">
                  {isHindi ? 'ट्रायल स्थिति' : 'Trial Status'}
                </span>
                <span className="text-xs font-extrabold text-rose-200">{isHindi ? 'ट्रायल पूर्ण' : 'Trial Ended'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
          <span>
            {isHindi
              ? '💡 नोट: प्रत्येक नए पंचायत उपयोगकर्ता को प्रथम 1 माह (30 दिन) का नि:शुल्क ट्रायल प्रदान किया जाता है।'
              : 'Note: Every registered user gets a 1-month free trial.'}
          </span>
          <span className="font-semibold text-[11px]">
            {isHindi ? 'डेवलपर सहयोग:' : 'Developer Support:'} {developerProfile.company} ({developerProfile.phone})
          </span>
        </div>
      </div>

      {/* SUBSCRIPTION PLANS GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>💎</span>
              <span>{isHindi ? 'उपलब्ध सदस्यता प्लान (Available Membership Plans)' : 'Available Plans'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {isHindi ? 'अपनी आवश्यकतानुसार उपयुक्त प्लान चुनें एवं एक्टिवेट करें' : 'Choose plan for uninterrupted access'}
            </p>
          </div>
        </div>

        {activePlans.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-4xl block">📦</span>
            <p className="text-xs font-bold text-slate-700">
              {isHindi ? 'डेवलपर द्वारा वर्तमान में प्लान अपडेट किए जा रहे हैं।' : 'Plans being updated by developer.'}
            </p>
            <p className="text-[11px] text-slate-500">
              {isHindi ? 'कृपया सीधे डेवलपर से संपर्क करें:' : 'Contact developer directly:'} {developerProfile.phone}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activePlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md hover:shadow-xl hover:border-emerald-500 transition-all space-y-4 flex flex-col justify-between relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-black text-slate-900 text-base">{plan.name}</h4>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border border-emerald-300">
                      {plan.period}
                    </span>
                  </div>

                  <div className="py-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">₹{plan.amount}</span>
                      <span className="text-xs font-bold text-slate-500">
                        / {plan.periodDays === 30 ? (isHindi ? 'माह' : 'Month') : plan.periodDays === 365 ? (isHindi ? 'वर्ष' : 'Year') : `${plan.periodDays} ${isHindi ? 'दिन' : 'Days'}`}
                      </span>
                    </div>
                  </div>

                  {plan.description && (
                    <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {plan.description}
                    </p>
                  )}

                  <ul className="text-xs space-y-2 text-slate-700 font-medium pt-1">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>{isHindi ? 'असीमित कर रसीदें एवं बिल निर्माण' : 'Unlimited Tax Receipts & Demand Bills'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>{isHindi ? 'समग्र आईडी परिवार डेटा सिंक' : 'Samagra ID Family Data Auto Sync'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>{isHindi ? 'तकनीकी सहायता एवं व्हाट्सएप अपडेट्स' : 'Developer Technical Support & Updates'}</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => setSelectedPlan(plan)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-500 mt-4"
                >
                  <span>⚡</span>
                  <span>{isHindi ? 'यह प्लान चुनें (Select Plan)' : 'Select Plan'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PLAN REQUEST MODAL */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {isHindi ? 'सदस्यता प्लान एक्टिवेशन' : 'Activate Subscription'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-emerald-900 block">{selectedPlan.name}</span>
              <p className="text-emerald-800 font-black text-lg">
                राशि: ₹{selectedPlan.amount} / {selectedPlan.periodDays} दिन
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-extrabold text-slate-800 block">
                {isHindi ? 'डेवलपर संपर्क एवं भुगतान जानकारी:' : 'Developer Contact & Payment:'}
              </span>
              <p className="text-slate-700"><strong>फर्म:</strong> {developerProfile.company}</p>
              <p className="text-slate-700"><strong>डेवलपर:</strong> {developerProfile.name}</p>
              <p className="text-slate-700"><strong>मोबाइल:</strong> {developerProfile.phone}</p>
              <p className="text-slate-700"><strong>ईमेल:</strong> {developerProfile.email}</p>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isHindi ? 'भुगतान यूटीआर / ट्रांजैक्शन आईडी अथवा संदेश (Optional)' : 'Payment Txn ID / Note'}
                </label>
                <input
                  type="text"
                  value={paymentTxn}
                  onChange={(e) => setPaymentTxn(e.target.value)}
                  placeholder={isHindi ? 'जैसे - PhonePe UTR 42091823901' : 'e.g. UTR / Txn Ref No'}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md border border-emerald-500"
                >
                  {isHindi ? 'अनुरोध भेजें' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSubscriptionView;
