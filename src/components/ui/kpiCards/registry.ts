import { KPI_IDS } from "../../../kpi/kpiIds";
import type { KpiCardComponent } from "./types";

import AtmIvCard from "./cards/AtmIvCard";
import IvrCard from "./cards/IvrCard";
import RealizedVolCard from "./cards/RealizedVolCard";
import IvRvSpreadCard from "./cards/IvRvSpreadCard";
import TermStructureCard from "./cards/TermStructureCard";
import Skew25dRrCard from "./cards/Skew25dRrCard";
import TsKinkCard from "./cards/TsKinkCard";
import RvEmFactorCard from "./cards/RvEmFactorCard";
import FundingCard from "./cards/FundingCard";
import EmRibbonCard from "./cards/EmRibbonCard";
import CondorCreditCard from "./cards/CondorCreditCard";
import EmHitRateCard from "./cards/EmHitRateCard";
import BasisCard from "./cards/BasisCard";
import SpotVsSmaCard from "./cards/SpotVsSmaCard";
import GammaWallsCard from "./cards/GammaWallsCard";
import OiConcentrationCard from "./cards/OiConcentrationCard";
import LiquidityStressCard from "./cards/LiquidityStressCard";
import StrikeMapCard from "./cards/StrikeMapCard";
import GammaCenterOfMassCard from "./cards/GammaCenterOfMassCard";
import VixCard from "./cards/VixCard";
import TimeToFirstBreachCard from "./cards/TimeToFirstBreachCard";
import PortfolioClientCard from "./cards/PortfolioClientCard";

type KpiId = (typeof KPI_IDS)[keyof typeof KPI_IDS];

const EXACT: Partial<Record<KpiId, KpiCardComponent>> = {
  [KPI_IDS.atmIv]: AtmIvCard,
  [KPI_IDS.ivr]: IvrCard,
  [KPI_IDS.rv]: RealizedVolCard,
  [KPI_IDS.ivRvSpread]: IvRvSpreadCard,
  [KPI_IDS.termStructure]: TermStructureCard,
  [KPI_IDS.skew25dRr]: Skew25dRrCard,
  [KPI_IDS.tsKink]: TsKinkCard,
  [KPI_IDS.rvEmFactor]: RvEmFactorCard,
  [KPI_IDS.funding]: FundingCard,
  [KPI_IDS.emRibbon]: EmRibbonCard,
  [KPI_IDS.condorCreditEm]: CondorCreditCard,
  [KPI_IDS.emHitRate]: EmHitRateCard,
  [KPI_IDS.spotPerpBasis]: BasisCard,
  [KPI_IDS.spotVsSma]: SpotVsSmaCard,
  [KPI_IDS.gammaWalls]: GammaWallsCard,
  [KPI_IDS.oiConcentration]: OiConcentrationCard,
  [KPI_IDS.liquidityStress]: LiquidityStressCard,
  [KPI_IDS.strikeMap]: StrikeMapCard,
  [KPI_IDS.gammaCenterOfMass]: GammaCenterOfMassCard,
  [KPI_IDS.vix]: VixCard,
  [KPI_IDS.timeToFirstBreach]: TimeToFirstBreachCard,
};

const PREDICATES: Array<{ test: (id: string) => boolean; card: KpiCardComponent }> =
  [{ test: (id) => id.startsWith("portfolio-client-"), card: PortfolioClientCard }];

export function resolveKpiCard(id: string): KpiCardComponent | null {
  const exact = (EXACT as Record<string, KpiCardComponent | undefined>)[id];
  if (exact) return exact;

  for (const p of PREDICATES) {
    if (p.test(id)) return p.card;
  }
  return null;
}
