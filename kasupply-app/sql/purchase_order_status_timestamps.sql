alter table public.purchase_orders
  add column if not exists processing_at timestamp with time zone null,
  add column if not exists shipped_at timestamp with time zone null;

update public.purchase_orders
set
  processing_at = coalesce(
    processing_at,
    case
      when status in ('processing', 'shipped', 'completed') then updated_at
      else null
    end
  ),
  shipped_at = coalesce(
    shipped_at,
    case
      when status = 'shipped' then updated_at
      when status = 'completed' then coalesce(shipped_at, completed_at, updated_at)
      else null
    end
  );
