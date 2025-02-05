import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEventSchema } from "@shared/schema";
import type { Event, InsertEvent } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { format, addHours } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EventFormProps {
  event?: Event | null;
  initialDate?: Date | null;
  onSubmit: (data: InsertEvent) => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

export default function EventForm({
  event,
  initialDate,
  onSubmit,
  onDelete,
  isLoading,
}: EventFormProps) {
  const form = useForm<InsertEvent>({
    resolver: zodResolver(
      insertEventSchema.extend({
        startTime: insertEventSchema.shape.startTime,
        endTime: insertEventSchema.shape.endTime,
      })
    ),
    defaultValues: event
      ? {
          ...event,
          startTime: format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm"),
          endTime: format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm"),
        }
      : {
          title: "",
          description: "",
          startTime: initialDate
            ? format(initialDate, "yyyy-MM-dd'T'HH:mm")
            : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          endTime: initialDate
            ? format(addHours(initialDate, 1), "yyyy-MM-dd'T'HH:mm")
            : format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
          location: "",
        },
  });

  const handleSubmit = (data: InsertEvent) => {
    const formattedData = {
      ...data,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
    };
    onSubmit(formattedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    value={typeof field.value === 'string' ? field.value : format(field.value, "yyyy-MM-dd'T'HH:mm")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    value={typeof field.value === 'string' ? field.value : format(field.value, "yyyy-MM-dd'T'HH:mm")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={isLoading}
            >
              Delete
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {event ? "Update" : "Create"} Event
          </Button>
        </div>
      </form>
    </Form>
  );
}