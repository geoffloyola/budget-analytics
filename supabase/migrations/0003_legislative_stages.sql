-- Versions of the budget during legislation (phase 2 of the budget cycle):
--   NEP     President's Budget, as submitted
--   HOUSE   House version of the General Appropriations Bill
--   SENATE  Senate version
--   BICAM   Bicameral Conference Committee version (ratified/enrolled)
--   GAA     Enacted, net of vetoes

alter table public.allocations drop constraint allocations_stage_check;
alter table public.allocations add constraint allocations_stage_check
  check (stage in ('NEP', 'HOUSE', 'SENATE', 'BICAM', 'GAA'));

alter table public.district_items drop constraint district_items_stage_check;
alter table public.district_items add constraint district_items_stage_check
  check (stage in ('NEP', 'HOUSE', 'SENATE', 'BICAM', 'GAA'));
