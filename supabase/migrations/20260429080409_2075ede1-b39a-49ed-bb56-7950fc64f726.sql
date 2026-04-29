
CREATE POLICY "Riders view own and unassigned orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'rider'::app_role)
  AND (
    rider_id IS NULL
    OR rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
  )
);
