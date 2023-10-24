import ForgeUI, {
  render,
  Form,
  TextField,
  SpaceSettings,
  DatePicker,
  Table,
  Cell,
  Head,
  Row,
  Text,
  Fragment,
  Select,
  Option,
  useState,
  useEffect,
  useProductContext,
  Button,
} from "@forge/ui";
import api, { webTrigger, route, storage } from "@forge/api";

type Meeting = {
  title: string;
  url: string;
  time: Date;
};

type Data = {
  spaceId?: string;
  meetings: Meeting[];
};

type Space = {
  key: string;
  id: string;
};

const getSpaces = async () => {
  const response = await api
    .asUser()
    .requestConfluence(route`/wiki/api/v2/spaces`, {
      headers: {
        Accept: "application/json",
      },
    });

  const data = await response.json();
  return data as { results: Space[] };
};

const App = () => {
  const onSubmit = async (formData: {
    title: string;
    url: string;
    date: string;
    time: string;
  }) => {
    if (!formData.title || !formData.url || !formData.date || !formData.time)
      return;

    if (!formData.url.startsWith("https://meet.google.com/")) return;

    let data: Data = await storage.get("data");

    const meeting: Meeting = {
      title: formData.title,
      url: formData.url,
      time: new Date(formData.date + " " + formData.time),
    };

    if (!data.meetings) data = { meetings: [] };

    data.meetings.push(meeting);

    setData(data);

    await storage.set("data", data);
  };

  const [data, setData] = useState<Data>({ meetings: [] });
  const productContext = useProductContext();

  useEffect(async () => {
    const fetchedData: Data = await storage.get("data");
    setData(fetchedData);

    const web = await webTrigger.getUrl("web-trigger-key");
  }, []);

  useEffect(async () => {
    const { spaceKey } = productContext;
    if (!spaceKey) return;

    const spaces = await getSpaces();
    const currentSpace = spaces.results.find((s) => s.key === spaceKey);

    if (!currentSpace) return;

    const data: Data = await storage.get("data");
    data.spaceId = currentSpace.id;
    setData(data);
    await storage.set("data", data);
  }, [productContext]);

  return (
    <Fragment>
      <Form onSubmit={onSubmit} submitButtonText="Schedule Meeting">
        <TextField name="title" label="Meeting Title" isRequired type="text" />
        <TextField
          name="url"
          label="Google Meet URL"
          isRequired
          description="https://meet.google.com/123-abc-xyz"
        />
        <DatePicker
          name="date"
          label="Meeting Date"
          description="Select the date of the meeting"
          isRequired
          defaultValue={new Date().toISOString().split("T")[0]}
        />
        <Select name="time" label="Meeting Time" isRequired>
          {Array.from(Array(24 * 4).keys()).map((i) => {
            const hour = Math.floor(i / 4);
            const minute = (i % 4) * 15;

            const hourString = hour < 10 ? "0" + hour : hour;
            const minuteString = minute === 0 ? "00" : minute;

            const timeString = `${hourString}:${minuteString}`;

            return (
              <Option
                label={timeString}
                value={timeString}
                defaultSelected={new Date().getHours() === hour}
              />
            );
          })}
        </Select>
      </Form>
      <Table>
        <Head>
          <Cell>
            <Text>Title</Text>
          </Cell>
          <Cell>
            <Text>Time</Text>
          </Cell>
          <Cell>
            <Text>URL</Text>
          </Cell>
          <Cell>
            <Text>Remove</Text>
          </Cell>
        </Head>
        {data.meetings.map((issue) => (
          <Row>
            <Cell>
              <Text>{issue.title}</Text>
            </Cell>
            <Cell>
              <Text>{new Date(issue.time).toUTCString()}</Text>
            </Cell>
            <Cell>
              <Text>{issue.url}</Text>
            </Cell>
            <Cell>
              <Button
                text="Remove"
                onClick={() => {
                  const index = data.meetings.indexOf(issue);
                  data.meetings.splice(index, 1);
                  setData(data);
                  storage.set("data", data);
                }}
              />
            </Cell>
          </Row>
        ))}
      </Table>
    </Fragment>
  );
};

export const run = render(
  <SpaceSettings>
    <App />
  </SpaceSettings>
);
