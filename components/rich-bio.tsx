import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Text as RNText, ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { env } from "@/lib/env";
import { useI18n } from "@/lib/i18n/provider";
import { parseBioHtml } from "@/lib/rich-bio/parse";
import type { Block, Run } from "@/lib/rich-bio/types";
import { useOpenLink } from "@/lib/use-open-link";
import { cn } from "@/lib/utils";

type Segment = { kind: "text"; runs: Run[] } | { kind: "cta"; run: Run };

// Bio images are stored as an API-relative path so the HTML survives domain changes.
export function bioImageUri(src: string): string {
	return src.startsWith("/") ? `${env.apiUrl}${src}` : src;
}

function splitCta(runs: Run[]): Segment[] {
	const segments: Segment[] = [];
	for (const run of runs) {
		if (run.cta && run.href) {
			segments.push({ kind: "cta", run });
			continue;
		}
		const last = segments[segments.length - 1];
		if (last?.kind === "text") last.runs.push(run);
		else segments.push({ kind: "text", runs: [run] });
	}
	return segments;
}

function RunText({ run }: { run: Run }) {
	const openLink = useOpenLink();
	const className = cn(
		run.marks?.includes("b") && "font-semibold",
		run.marks?.includes("i") && "italic",
		run.marks?.includes("u") && "underline",
		run.marks?.includes("s") && "line-through",
		run.href && "text-primary underline",
	);
	return (
		<RNText
			className={className}
			onPress={run.href ? () => openLink(run.href ?? "") : undefined}
		>
			{run.text}
		</RNText>
	);
}

function Inline({ runs }: { runs: Run[] }) {
	return runs.map((run, i) => <RunText key={i} run={run} />);
}

function CtaButton({ run }: { run: Run }) {
	const openLink = useOpenLink();
	return (
		<Button
			size="sm"
			className="self-start"
			onPress={() => openLink(run.href ?? "")}
			accessibilityRole="link"
			accessibilityLabel={run.text}
		>
			<Text>{run.text}</Text>
		</Button>
	);
}

function TextBlock({
	runs,
	variant,
	className,
}: {
	runs: Run[];
	variant?: "title" | "large";
	className?: string;
}) {
	const segments = splitCta(runs);
	if (segments.length === 1 && segments[0].kind === "text") {
		return (
			<Text variant={variant} className={className}>
				<Inline runs={segments[0].runs} />
			</Text>
		);
	}
	return (
		<View className="gap-2">
			{segments.map((segment, i) =>
				segment.kind === "cta" ? (
					<CtaButton key={i} run={segment.run} />
				) : (
					<Text key={i} variant={variant} className={className}>
						<Inline runs={segment.runs} />
					</Text>
				),
			)}
		</View>
	);
}

function BioImage({ src, alt }: { src: string; alt?: string }) {
	const [ratio, setRatio] = useState(16 / 9);
	return (
		<Image
			source={{ uri: bioImageUri(src) }}
			accessibilityLabel={alt}
			contentFit="cover"
			cachePolicy="memory-disk"
			transition={200}
			onLoad={({ source }) => {
				if (source.width > 0 && source.height > 0) {
					setRatio(source.width / source.height);
				}
			}}
			className="bg-muted w-full rounded-2xl"
			style={{ aspectRatio: ratio }}
		/>
	);
}

function TableBlock({
	rows,
}: {
	rows: Extract<Block, { type: "table" }>["rows"];
}) {
	return (
		<ScrollView horizontal showsHorizontalScrollIndicator={false}>
			<View className="border-border overflow-hidden rounded-xl border">
				{rows.map((row, ri) => (
					<View
						key={ri}
						className={cn("flex-row", ri > 0 && "border-border border-t")}
					>
						{row.cells.map((cell, ci) => (
							<View
								key={ci}
								className={cn(
									"w-40 px-3 py-2",
									ci > 0 && "border-border border-l",
									cell.header && "bg-muted",
								)}
							>
								<Text
									variant="small"
									className={cn(cell.header && "font-semibold")}
								>
									<Inline runs={cell.runs} />
								</Text>
							</View>
						))}
					</View>
				))}
			</View>
		</ScrollView>
	);
}

export function RichBioBlock({ block }: { block: Block }) {
	const { t } = useI18n();
	switch (block.type) {
		case "p":
			return (
				<TextBlock runs={block.runs} className="text-foreground leading-6" />
			);
		case "h2":
			return <TextBlock runs={block.runs} variant="title" className="mt-2" />;
		case "h3":
			return <TextBlock runs={block.runs} variant="large" className="mt-1" />;
		case "quote":
			return (
				<View className="border-border border-l-2 pl-3">
					<TextBlock
						runs={block.runs}
						className="text-muted-foreground leading-6"
					/>
				</View>
			);
		case "ul":
		case "ol":
			return (
				<View className="gap-1">
					{block.items.map((runs, i) => (
						<View key={i} className="flex-row gap-2">
							<Text className="text-muted-foreground">
								{block.type === "ol" ? `${i + 1}.` : "•"}
							</Text>
							<Text className="text-foreground flex-1 leading-6">
								<Inline runs={runs} />
							</Text>
						</View>
					))}
				</View>
			);
		case "hr":
			return <View className="border-border my-1 border-t" />;
		case "img":
			return <BioImage src={block.src} alt={block.alt} />;
		case "table":
			return <TableBlock rows={block.rows} />;
		case "raw":
			return <Text variant="muted">{t("richBio.unsupported")}</Text>;
	}
}

export function RichBioBlocks({
	blocks,
	className,
}: {
	blocks: Block[];
	className?: string;
}) {
	return (
		<View className={cn("gap-2", className)}>
			{blocks.map((block, i) => (
				<RichBioBlock key={i} block={block} />
			))}
		</View>
	);
}

/** Renders a profile's rich bio. `html` is sanitized server-side on save. */
export function RichBio({
	html,
	className,
}: {
	html: string;
	className?: string;
}) {
	const blocks = useMemo(() => parseBioHtml(html), [html]);
	return <RichBioBlocks blocks={blocks} className={className} />;
}
